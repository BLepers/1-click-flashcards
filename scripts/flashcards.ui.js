var currentFlashCard;
var specialWords = {
   'help':`    <li>Search for a word</li>
               <li class="content selected_content">Select definitions you want to keep by clicking/taping on them (by default all are kept)</li>
               <li id="li_save">Save the word in your flashcards<p id="save_icon" style="display:grid;justify-content:center"></p></li>
               <li>You can then learn definitions. Rate as follows:
               <ul>
                  <li>1-3 mean that you don't know the card. 1-"very hard to remember even after seeing definition" to 3-"easier to remember"</li>
                  <li>4: you know the answer but want to get quizzed more frequently on the card</li>
                  <li>5 does not change the quizz frequency of the card</li>
                  <li>6 decreases the quizz frequency of the card</li>
               </ul>
               See <a href="https://en.wikipedia.org/wiki/SuperMemo">wikipedia</a> for a description of the algorithm</li>
               <li>You can also search within the definitions of saved words by searching for s:regexp. E.g.: <a href='#!s:run|walk|move'>s:run|walk|move</a> will search for all definitions matching "run" (possibly within a word), and  <a href='#!s:\\b(run)\\b'>s:\\b(run)\\b</a> will search for all definitions containing the word "run".</li>
               <li>You can translate from french to english using t:word, e.g. <a href='#!t:génial'>t:génial</a>. It is not possible to save translations but you can click on the translated words to save them in your flashcards.</li>`
};

var SmallFlashCardState = {
   uid: 0,
   displayedWords: {},
   nbDisplayedWords:0,
   promise:null,
};
class SmallFlashCard {
   constructor(word) {
      this.word = word;
   }

   addClickAction() {
      var self = this;
      $(this.div).unbind().click(function() {
         self.switchToBig();
      });
   }

   addInList() {
      var id = "small"+(SmallFlashCardState.uid++);
      this.div = "#"+id;
      $("#flashcard_list").prepend('<li id="'+id+'" class="smallcard">'+this.word+'</li>');
      this.addClickAction();
      SmallFlashCardState.displayedWords[this.word] = this;
      SmallFlashCardState.nbDisplayedWords++;
      SmallFlashCard.updateText();
   }

   show(div) {
      this.div = div;
      $(div).text(this.word).addClass('smallcard');
      this.addClickAction();
   }

   switchToBig() {
      $(this.div).text('').removeClass('smallcard');
      new BigFlashCard(this.word).show(this.div);
   }

   static setLoadingStatus(s) {
      SmallFlashCardState.loading = s;
      SmallFlashCard.updateText();
   }

   static updateText() {
      $("#flashcard_list_info").text('');
      if(SearchEngine.getCurrentSearch() && SearchEngine.getRegex())
         $("#flashcard_list_info").append('Search results "'+SearchEngine.getCurrentSearch()+'" - ');
      if(SmallFlashCardState.nbDisplayedWords > 1)
         $("#flashcard_list_info").append(SmallFlashCardState.nbDisplayedWords+' cards');
      else
         $("#flashcard_list_info").append(SmallFlashCardState.nbDisplayedWords+' card');
      if(SmallFlashCardState.nbDisplayedWords != SmallFlashCardState.uid)
         $("#flashcard_list_info").append(' / ' + SmallFlashCardState.uid);
      if(SmallFlashCardState.loading)
         $("#flashcard_list_info").append(' (loading, might be slow because regex-search is disabled on the server side due to read-only mode)');
   }

   static showWord(w) {
      var card = SmallFlashCardState.displayedWords[w];
      if(!card)
         return;
      $(card.div).css('display', 'flex');
      SmallFlashCardState.nbDisplayedWords++;
      SmallFlashCard.updateText();
   }

   static hideAll(loading) {
      SmallFlashCard.setLoadingStatus(loading);
      if(SmallFlashCardState.nbDisplayedWords == 0)
         return;

      $('.smallcard').css('display', 'none');
      SmallFlashCardState.nbDisplayedWords = 0;
      SmallFlashCard.updateText();
   }

   static showAll(loading) {
      SmallFlashCard.setLoadingStatus(loading);
      if(SmallFlashCardState.nbDisplayedWords == SmallFlashCardState.uid)
         return;

      $('.smallcard').css('display', 'flex');
      SmallFlashCardState.nbDisplayedWords = SmallFlashCardState.uid;
      SmallFlashCard.updateText();
   }

   static showError() {
      $("#flashcard_list").append('<li class="error">To start, search and add new words</li>');
   }

   static maybeAdd(word) {
      if(!SmallFlashCardState.displayedWords[word]) {
         new SmallFlashCard(word).addInList();
      }
   }

   static delete(word) {
      if(SmallFlashCardState.displayedWords[word]) {
         $(SmallFlashCardState.displayedWords[word].div).remove();
         delete SmallFlashCardState.displayedWords[word];
      }
   }

   static async wait() {
      await SmallFlashCardState.promise;
   }

   static loadAll() {
      $("#flashcard_list").text('').css('display', 'block');
      $("#flashcard_list_info").text('').css('display', 'block');

      SmallFlashCardState.promise = $.Deferred();
      CacheDictionary.listAll(function(data) {
         for(var i in data)
            new SmallFlashCard(data[i]).addInList();
         if(data.length == 0)
            SmallFlashCard.showError();
         SmallFlashCardState.promise.resolve();
      });
   }
}

class FlashCardUI {
   constructor(word) {
      //$.doTimeout('searchID');
      this.word = word;
      if(!specialWords[this.word]) {
         this.flashcard = FlashCard.getCard(word);
         this.promise = this.flashcard.prepare();
      } else {
         this.promise = new Promise((res, rej) => res());
      }
   }

   switchToSmall() {
      if(this.div == "#main_flashcard")
         return;
      $(this.div).text('').removeClass('flashcard');
      new SmallFlashCard(this.word).show(this.div);
   }

   showDefinition(id) {
      var flash = this.flashcard;
      $(this.div + ' #no_def').css('display', 'none')
      $(this.div + " #definitions").append('<li id="'+id+'" class="content"><p><p class="text"></p><p class="example"></p><ul class="synonyms"></ul></p></li>');

      var def = flash.elements[id]["definition"];
      if(SearchEngine.getRegex())
         def = def.replace(SearchEngine.getRegex(), '<em>$&</em>');
      $(this.div + ' #'+id+' .text').html(def);
      if(flash.elements[id]["registers"])
         $(this.div + ' #'+id+' .text').prepend('<p class="note">'+flash.elements[id]["registers"]+'</p>');
      if(flash.elements[id]["regions"])
         $(this.div + ' #'+id+' .text').prepend('<p class="note">'+flash.elements[id]["regions"]+'</p>');
      $(this.div + ' #'+id+' .example').html(flash.elements[id]["example"]);
      for(var s in flash.elements[id]["synonyms"]) {
         $(this.div + ' #'+id+' .synonyms').append('<li id="syn'+s+'">'+flash.elements[id]["synonyms"][s]+'</li>');
         $(this.div + ' #'+id+' .synonyms #syn'+s).click(function() {
            window.location.hash = "#!"+encodeURIComponent($(this).text());
         });
      }
   }

   tooLate() {
      // We asynchronously fetched a flashcard and want to display it... but the user wants another card now...
      return this.div == '#main_flashcard' && currentFlashCard != this.word;
   }

   async show(div) {
      var self = this;
      this.div = div;

      /* Are we on the main flashcard div? */
      if(div == '#main_flashcard') {
         if(this.word != currentFlashCard) {
            currentFlashCard = this.word;
            //window.location.hash = '#!'+encodeURIComponent(this.word);
            $([document.documentElement, document.body]).stop().animate({
               scrollTop: 0,
            }, 1000);
         } else {
            return -1;
         }
      } else {
         $(div).unbind().click(function() {
            self.switchToSmall();
         });
      }

      $(div).text('').css('display', 'flex');

      /* Show base template */
      var html = $('#flashcard_tmpl').clone().attr('id', '').removeClass('tmpl');
      html.find('.title').text(this.word);
      html.find('#text_to_speech source').attr('src', "https://www.google.com/speech-api/v1/synthesize?text="+this.word+"&enc=mpeg&lang=en&speed=0.4&client=lr-language-tts&use_google_only_voices=1");
      $(div).addClass('flashcard').html(html);

      /* Activate the sound icon */
      $(div + " #sound_icon").unbind().click(function(e) {
         e.stopPropagation();
         $(div + " #text_to_speech").trigger("play");
      });
      $(div).find("#self_input").css('display', 'none');

      /* Prepare the buttons that fetch extra definitions (hidden) */
      for(var i in dicts) {
         $(div).append('<p id="'+i+'" class="more" style="display:none">'+dicts[i].id()+'</p>');
         $(div + " #"+i).unbind().click(function(e) {
            e.stopPropagation();
            var id = $(this).attr('id');
            $(div + " #"+id).css('display', 'none');
            self.flashcard.fetch(function(data) {
               if(!data)
                  $(div + ' #no_def').css('display', 'inline-block').text('No definition found ('+dicts[id].id()+')');
               for(var j in self.flashcard.elements) {
                  if(self.flashcard.elements[j]["dictionary"] == id)
                     self.showDefinition(j);
               }
            }, dicts[id]);
         });
      }
      await this.promise;
   }

   static resetCurrent(hide = true) {
      currentFlashCard = "";
      if(hide)
         $('#main_flashcard').text('').css('display', 'none');
   }
}

class EditableFlashCard extends FlashCardUI {
   showDefinition(id) {
      var div;
      var styled = true;
      var flash = this.flashcard;

      if(flash.elements[id]["dictionary"] == "user") {
         $(this.div + ' #self_input').val(flash.elements[id]["definition"]);
         styled = false;
         div = $(this.div + ' #only_self_input');
      } else {
         super.showDefinition(id);
         div = $(this.div + ' #'+id);
      }

      function changeStyle() {
         if(flash.elements[id]["selected"]) {
            if(styled)
               div.removeClass('selectable_content').addClass('selected_content');
            else
               div.prop("checked", true);
         } else {
            if(styled)
               div.removeClass('selected_content').addClass('selectable_content');
            else
               div.prop("checked", false);
         }
      }
      changeStyle();

      div.unbind().click(function() {
         if(flash.elements[id]["selected"])
            delete flash.elements[id]["selected"];
         else
            flash.elements[id]["selected"] = true;
         changeStyle();
      });
   }

   async show(div) {
      var self = this;
      var flash = this.flashcard;
      var res = await super.show(div);
      if(res == -1 || this.tooLate())
         return;

      $(div).unbind();

      /* Show all definitions & dict buttons */
      var seen = {};
      for(var i in flash.elements) {
         this.showDefinition(i);
         seen[flash.elements[i]["dictionary"]] = 1;
      }
      for(var i in dicts) {
         if(!seen[i] && i!= defaultDict)
            $(div + ' #' + i).css('display', 'block');
      }
      if(!flash.elements.length)
         $(div + ' #no_def').css('display', 'inline-block').text('No definition found');

      /* Show note box */
      $(div).find("#self_input").css('display', 'inline-block');
      $(div).find("#only_self_input").css('display', 'inline-block');
      $(div).find("#only_self_input_label").css('display', 'inline-block');


      /* Add save action */
      $(div + ' .floating_action').removeClass('floating_edit');
      $(div + ' .floating_image').append($('#save_icon_tmpl').clone().attr('id', 'save').removeClass('tmpl'));
      if(flash.saved) {
         $(div + ' .floating_image').append('<div style="height:10px"/>');
         $(div + ' .floating_image').append($('#delete_action_tmpl').clone().attr('id', 'rm').removeClass('tmpl'));
      }

      $(div + ' #save').unbind().click(function(e) {
         e.stopPropagation();
         $(div).unbind();
         $(div + ' #save').unbind();
         $(div + ' #rm').unbind()
         $(div + ' .floating_image').css('opacity', 0.1);
         flash.registerUserNote($(div + ' #self_input').val());
         flash.persist().done(function() {
            currentFlashCard = "";
            new BigFlashCard(self.word).show(self.div);
            SmallFlashCard.maybeAdd(self.word);
         });
      });

      $(div + ' #rm').unbind().click(function(e) {
         e.stopPropagation();
         $(div).unbind();
         $(div + ' #save').unbind();
         $(div + ' #rm').unbind()
         $(div + ' .floating_image').css('opacity', 0.1);
         SmallFlashCard.delete(self.word);
         flash.delete().done(function() {
            currentFlashCard = "";
            $(self.div).text('');
         });
      });
   }
}

class BigFlashCard extends FlashCardUI {
   showDefinition(id) {
      var flash = this.flashcard;

      if(flash.elements[id]["dictionary"] == "user") {
         var def = flash.elements[id]["definition"];
         if(SearchEngine.getRegex())
            def = def.replace(SearchEngine.getRegex(), '<em>$&</em>');
         $(this.div + ' #self_definition').html(def);
      } else {
         super.showDefinition(id);
      }

   }

   showSavedDefinitions(div) {
      var flash = this.flashcard;

      /* Show saved definitions */
      var shown = 0;
      var subset = false;
      for(var i in flash.elements) {
         if(flash.elements[i]["selected"])
            subset = true;
      }
      for(var i in flash.elements) {
         if(flash.elements[i]["selected"] || !subset || flash.elements[i]["dictionary"] == "user") {
            shown++;
            this.showDefinition(i);
         }
      }
      if(!shown)
         $(div + ' #no_def').css('display', 'inline-block').text('No definition found');
   }

   async show(div, hidden_definitions, uneditable) {
      var self = this;
      var flash = this.flashcard;
      var res = await super.show(div);
      if(res == -1 || this.tooLate())
         return;

      /* BigFlashCard is only for saved flashcards */
      if(!flash.saved) {
         $(div + ' #no_def').css('display', 'inline-block').text('Trying to display a non saved flashcard?');
         return;
      }

      /* Show definitions */
      if(!hidden_definitions)
         this.showSavedDefinitions(div);

      /* Add edit action */
      if(!uneditable) {
         $(div + ' .floating_action').addClass('floating_edit');
         $(div + ' .floating_image').append($('#edit_icon_tmpl').clone().attr('id', 'edit').removeClass('tmpl'));
         $(div + ' #edit').unbind().click(function(e) {
            e.stopPropagation();
            $(div).unbind();
            $(div + ' #edit').unbind();
            $(div + ' .floating_image').css('opacity', 0.1);
            currentFlashCard = "";
            new EditableFlashCard(self.word).show(self.div);
         });
      }
   }
}

class BigOrEditableFlashCard extends FlashCardUI {
   async show(div) {
      var flash = this.flashcard;
      var res = await super.show(div);
      if(res == -1 || this.tooLate())
         return;

      if(specialWords[this.word]) {
         $(this.div + " #definitions").html(specialWords[this.word]);
         $(this.div + " #save_icon").append($('#save_icon_tmpl').clone().attr('id', 'save').removeClass('tmpl'));
         return;
      }

      currentFlashCard = "";
      if(flash.saved)
         new BigFlashCard(this.word).show(div);
      else
         new EditableFlashCard(this.word).show(div);
   }
}


class TestFlashCard extends BigFlashCard {
   async show(div) {
      var self = this;
      currentFlashCard = "";
      var flash = this.flashcard;
      var res = await super.show(div, true, true);
      if(res == -1 || this.tooLate())
         return;

      $(div + ' #expand').append($('#expand_tmpl').clone().attr('id', 'expand_icon').removeClass('tmpl')).click(function() {
         $(div + ' #expand').css('display', 'none');
         self.showSavedDefinitions(div);
         $(div + ' .synonyms').children().unbind();
      });
   }
};

class TranslationFlashCardUI {
   static show(div, word) {
      $([document.documentElement, document.body]).stop().animate({
         scrollTop: 0,
      }, 1000);

      var html = $('#translation_tmpl').clone().attr('id', '').removeClass('tmpl');
      html.find('.title').text(word);
      $(div).addClass('flashcard').html(html);
      $(div).css('display', 'flex');
   }

   static showTranslations(div, translations = {}) {
      var shown = 0;
      $(div).find('#definitions').append('<li><ul class="synonyms" style="padding: 0;"></ul></li>');
      for(var i in translations["translations"]) {
         $(div).find('.synonyms').append('<li id="syn'+i+'">'+translations["translations"][i]+'</li>');
         shown++;
      }
      for(var i in translations["examples"]) {
         $(div).find('#definitions').append('<li id="'+i+'" class="content"><p><p class="text">'+translations["examples"][i]["orig"]+'</p><p class="example">'+translations["examples"][i]["trans"]+'</p></p></li>');
         shown++;
      }
      $(div).find('.synonyms').children().unbind().click(function() {
         window.location.hash = "#!"+encodeURIComponent($(this).text());
      });
      if(!shown)
         $(div + ' #no_def').css('display', 'inline-block').text('No translation found');
   }
}
