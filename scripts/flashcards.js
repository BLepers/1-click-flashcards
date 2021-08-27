var existingFlashCards = {};

class FlashCard {
   constructor(word) {
      this.word = word;
      this.dictionaries = [];
      this.elements = [];
      this.cache_checked = false;
      this.saved = false;

      existingFlashCards[this.word] = this;
   }

   fetch(cb, dictionary) {
      var self = this;

      function fetch_cb(data) {
         for(var i in data) {
            self.elements.push(data[i]);
         }
         cb();
      }

      if(dictionary) { // If we force fetch from a dictionary, just do it
         dictionary.fetch(self.word, fetch_cb);
      } else if(self.elements.length) { // If data has already been fetched, return
         return cb();
      } else if(!self.cache_checked) { // Else, check cache
         CacheDictionary.fetch(self.word, function(data) {
            self.cache_checked = true;
            if(!data.length) { // no data in cache
               self.fetch(cb);
            } else { // data in cache, process it
               self.saved = true;
               fetch_cb(data);
            }
         });
      } else { // Or fallback to default dictionary
         dicts[defaultDict].fetch(self.word, fetch_cb);
      }
   }

   prepare() {
      if(this.promise)
         return this.promise;

      this.promise = $.Deferred();
      this.fetch(this.promise.resolve);
      return this.promise;
   }

   registerUserNote(text) {
      if(!text) {
         for(var i in this.elements) {
            if(this.elements[i]["dictionary"] == "user") {
               this.elements.splice(i, 1);
            }
         }
      } else {
         for(var i in this.elements) {
            if(this.elements[i]["dictionary"] == "user") {
               this.elements[i]["definition"] = text;
               return;
            }
         }
         this.elements.push({
            definition:text,
            dictionary:"user"
         });
      }
   }

   persist() {
      var self = this;
      var res = $.Deferred();
      CacheDictionary.persist(this.word, this.elements, function() {
         self.saved = true;
         res.resolve();
      });
      return res;
   }

   delete() {
      var self = this;
      var res = $.Deferred();
      CacheDictionary.delete(this.word, function() {
         delete existingFlashCards[self.word];
         res.resolve();
      });
      return res;
   }

   static getCard(word) {
      if(existingFlashCards[word])
         return existingFlashCards[word];
      else
         return new FlashCard(word);
   }
}
