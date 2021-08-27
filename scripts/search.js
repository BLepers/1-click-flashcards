var SearchEngineState = {
   currentSearch:null,
   currentRegex:null,
   potentialMatches:0,
   matchesExplored:0,
   firstInput:true,
};
class SearchEngine {
   static async maybeDisplay(word, search, regex) {
      var flash = FlashCard.getCard(word);
      var promise = flash.prepare();

      await promise;
      if(SearchEngineState.currentSearch != search)
         return;

      SearchEngineState.matchesExplored++;
      if(SearchEngineState.matchesExplored == SearchEngineState.potentialMatches)
         SmallFlashCard.setLoadingStatus(false);

      var subset = false;
      for(var i in flash.elements) {
         if(flash.elements[i]["selected"])
            subset = true;
      }
      for(var i in flash.elements) {
         if(flash.elements[i]["selected"] || !subset || flash.elements[i]["dictionary"] == "user") {
            if(flash.elements[i]["definition"].match(regex)) {
               SmallFlashCard.showWord(word);
            }
         }
      }
   }

   static async search(w, input = false) {
      var m;
      var replaceState = false;

      if(SearchEngineState.currentSearch == w)
         return;
      if(!input) {
         SearchEngineState.firstInput = true;
      } else if(!SearchEngineState.firstInput) {
         replaceState = w.startsWith(SearchEngineState.currentSearch);
      }
      SearchEngineState.firstInput = !input;

      SearchEngineState.currentSearch = w;
      if(!replaceState) {
         if((!w || w=="") && (!window.location.hash || !window.location.hash=="")) {
            // do nothing
         } else {
            window.location.hash = '#!'+encodeURIComponent(w);
         }
      } else {
         history.replaceState('', '', '#!'+encodeURIComponent(w));
      }

      Teacher.stop();
      FlashCardUI.resetCurrent(false);

      if(!w || w == "") { // No search
         SearchEngineState.currentSearch = null;
         SearchEngineState.currentRegex = null;
         SmallFlashCard.showAll();
         SmallFlashCard.updateText();
         FlashCardUI.resetCurrent();
      } else if(m = w.match(/s:(.+)/)) { // Search within definitions
         /* Wait for the list of all words to be ready */
         await SmallFlashCard.wait();
         if(SearchEngineState.currentSearch != w)
            return;

         /* Hide everything */
         FlashCardUI.resetCurrent();
         SmallFlashCard.hideAll(true);

         var regex = m[1];
         try {
            SearchEngineState.currentRegex = new RegExp(regex, 'gi');
            $('#error').css('display', 'none');
         } catch(e) {
            $('#error').css('display', 'block').text('Invalid regexp');
            SmallFlashCard.setLoadingStatus(false);
            return;
         }

         /* Ask php to do a rough grep of matching cards */
         var url = "./php/cards.php?action=search&regex="+encodeURIComponent("/"+regex+"/i");
         $.getJSON(url, function(data) {
            if(SearchEngineState.currentSearch != w)
               return;
            SearchEngineState.matchesExplored = 0;
            if(!data.length)
               SmallFlashCard.setLoadingStatus(false);
            else
               SearchEngineState.potentialMatches = data.length;

            for(var word in data)
               SearchEngine.maybeDisplay(data[word], w, SearchEngineState.currentRegex);
         }).fail(function(e) {
            window.dispatchEvent(new CustomEvent('myerror', { detail:"Error parsing "+url }));
         });
      } else if(m = w.match(/t:(.+)/)) {
         var word = m[1];
         TranslationFlashCardUI.show('#main_flashcard', word);
         ReversoTranslationsDictionary.fetch(word, function(data) {
            if(SearchEngineState.currentSearch != w)
               return;
            TranslationFlashCardUI.showTranslations('#main_flashcard', data);
         });
      } else { // Simpler search, just on the title
         SearchEngineState.currentRegex = null;
         SmallFlashCard.showAll();
         SmallFlashCard.updateText();
         new BigOrEditableFlashCard(w).show('#main_flashcard');
      }
   }

   static getRegex() {
      return SearchEngineState.currentRegex;
   }

   static getCurrentSearch() {
      return SearchEngineState.currentSearch;
   }
}
