var TeacherCacheState = { 
   cache:null,
   words:[],
   current_word:null,
};
class TeacherCache {
   static setWord(w) {
      TeacherCacheState.current_word = w;
   }

   static firstWord() {
      TeacherCacheState.current_word = TeacherCacheState.words[0];
      return TeacherCacheState.current_word;
   }

   // Should we wait before learning current card?
   static isTooRecent(w) {
      if(!TeacherCacheState.cache[w])
         return false;

      var now = Date.now()/1000;
      var I = TeacherCacheState.cache[w]['I'];
      var last = TeacherCacheState.cache[w]['last'];
      return now < last + I;
   }

   // See https://en.wikipedia.org/wiki/SuperMemo
   static updateCurrent(q) {
      var w = TeacherCacheState.current_word;
      var n = TeacherCacheState.cache[w]['n'];
      var EF = TeacherCacheState.cache[w]['EF'];
      var I = TeacherCacheState.cache[w]['I'];

      if(TeacherCacheState.words.indexOf(w) != -1)
         TeacherCacheState.words.splice(TeacherCacheState.words.indexOf(w), 1);

      if(q == -1) { // stop learning
         I = 10000;
      } else if(q >= 3) { // Correct response
         if(n == 0)
            I = 1;
         else if(n == 1)
            I = 6;
         else
            I = I * EF;
         n++;
      } else { // incorrect
         n = 0;
         I = 1;
      }
      if(q != -1)
         EF = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
      if(EF < 1.3)
         EF = 1.3;

      var url = "./php/cards.php?action=putsm2&n="+n+"&EF="+EF+"&I="+I+"&word="+encodeURIComponent(w);
      $.getJSON(url, function(data) {
      }).fail(function(e) {
         window.dispatchEvent(new CustomEvent('myerror', { detail:"Error parsing "+url }));
      });
   }

   static getAll(cb) {
      if(TeacherCacheState.cache)
         return cb(TeacherCacheState.words);

      var url = "./php/cards.php?action=getallsm2";
      $.getJSON(url, function(data) {
         TeacherCacheState.cache = data;
         for(var w in data) {
            if(data[w].I != 10000)
               TeacherCacheState.words.push(w);
            data[w].n = parseFloat(data[w].n);
            data[w].I = parseFloat(data[w].I);
            data[w].EF = parseFloat(data[w].EF);
            data[w].last = parseFloat(data[w].last);
            data[w].last += (Math.random()*(60*60)); // add 1h of randomness to the last test to avoid always testing in the same order
         }
         // Sort words by last tested + interval of test (in days)
         TeacherCacheState.words.sort(function(a, b) {
            var atime = data[a].last + data[a].I*(24*60*60);
            var btime = data[b].last + data[b].I*(24*60*60);
            return atime - btime;
         });
         cb(TeacherCacheState.words);
      }).fail(function(e) {
         window.dispatchEvent(new CustomEvent('myerror', { detail:"Error parsing "+url }));
      });
   }
}


var TeacherState = {
   oldHashFunction:null,
   currentFlashCard:null
};
class Teacher {
   static showCard() {
      var str = location.hash;
      var s = unescape(str).replace(/#!?/,'');
      if(s != "" && s!=TeacherState.currentFlashCard) {
         TeacherState.currentFlashCard = s;
         TeacherCache.setWord(s);

         if(TeacherCache.isTooRecent(s))
            $('#error').css('display', 'block').text('All cards have been learnt recently, you should wait before learning them again.');

         var ui = new TestFlashCard(s)
         ui.show('#main_flashcard');
         for(var i = 1; i < 7; i++) {
            $('#rate'+i).unbind().click({rate: i}, function(e) {
               TeacherCache.updateCurrent(e.data.rate - 1);
               Teacher.showNext();
            })
            $('#stop_rate').unbind().click(function(e) {
               TeacherCache.updateCurrent(-1);
               Teacher.showNext();
            });
         }
      }
   }

   static showNext() {
      if(TeacherCacheState.words.length == 0)
         Teacher.stop();
      else
         window.location.hash = '#!'+TeacherCache.firstWord();
   }

   static stop() {
      if(!TeacherState.started)
         return;

      window.onhashchange = undefined;
      window.location.hash = '#!';
      window.onhashchange = TeacherState.oldHashFunction;

      $('#search').css('display', '');
      $('#ratings').css('display', 'none');
      $('.flist').css('display', '');
      $("#flashcard_list_info").css('display', 'block');
      $('.learn').unbind().text('Learn').click(Teacher.start);
      $('#main_flashcard').text('');
      $('#error').css('display', 'none');

      TeacherState.started = false;
   }

   static start() {
      TeacherState.started = true;
      $.doTimeout();

      TeacherState.oldHashFunction = window.onhashchange;
      window.onhashchange = undefined;
      window.location.hash = '#!';
      window.onhashchange = Teacher.showCard;

      TeacherState.currentFlashCard = "";
      $('#error').css('display', 'none');
      $('#search').css('display', 'none');
      $('#ratings').css('display', 'block');
      $('.flist').css('display', 'none');
      $("#flashcard_list_info").css('display', 'none');
      $('.learn').css('opacity', '0.1').unbind().text('...');
      $('#main_flashcard').text('');
      TeacherCache.getAll(function(data) {
         if(data.length == 0)
            $('#error').css('display', 'block').text('No card to learn (refresh to learn newly added cards)');
         else
            Teacher.showNext();
         $('.learn').css('opacity', '1').text('Stop').click(Teacher.stop);
      });
   }
}

