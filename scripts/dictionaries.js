class Dictionary {
   static fetch(word) {
      throw new Error("Dictionary is an abstract class");
   }
}

class CacheDictionary extends Dictionary {
   static fetch(word, cb) {
      var url = "./php/cards.php?action=get&word=";
      return $.getJSON(url+encodeURIComponent(word)).done(function( data ) {
         cb(data);
      }).fail(function(e) {
         window.dispatchEvent(new CustomEvent('myerror', { detail:"Error parsing "+url+encodeURIComponent(word) }));
      });
   }
   static persist(word, data, cb) {
      var url = "./php/cards.php?action=put&word=";
      $.ajax({
            url: url+encodeURIComponent(word),
            type: "POST",
            dataType:'json',
            data: { data:JSON.stringify(data) }
      }).done(function(data) {
         if(data['success'] && data['success'] == "ko")
            window.dispatchEvent(new CustomEvent('myerror', { detail: data['reason'] }));
         cb(data);
      }).fail(function(e) {
         window.dispatchEvent(new CustomEvent('myerror', { detail:"Error parsing "+url+encodeURIComponent(word) }));
      });
   }
   static delete(word, cb) {
      var url = "./php/cards.php?action=delete&word=";
      return $.getJSON(url+encodeURIComponent(word)).done(function( data ) {
         cb(data);
      }).fail(function(e) {
         window.dispatchEvent(new CustomEvent('myerror', { detail:"Error parsing "+url+encodeURIComponent(word) }));
      });
   }
   static listAll(cb) {
      var url = "./php/cards.php?action=getall";
      $.getJSON(url, function(data) {
         cb(data);
      }).fail(function(e) {
         window.dispatchEvent(new CustomEvent('myerror', { detail:"Error parsing "+url }));
      });
   }
}

class ApiDictionary extends Dictionary {
   static id() {
      return "Wiktionary";
   }

   static fetch(word, cb) {
      var ret = [];
      var url = "https://api.dictionaryapi.dev/api/v2/entries/en/";

      $.getJSON(url+encodeURIComponent(word)).done(function( data ) {
         for(var m in data) {
            var meanings = data[m]["meanings"];
            for(var i in meanings) {
               for(var j in meanings[i]["definitions"]) {
                  ret.push({
                     "definition":meanings[i]["definitions"][j]["definition"],
                     "example":meanings[i]["definitions"][j]["example"],
                     "synonyms":meanings[i]["definitions"][j]["synonyms"],
                     "dictionary":"api",
                  });
               }
            }
         }
         cb(ret);
      }).fail(function(e) {
         if(e.status == 404) {
            cb();
         } else {
            window.dispatchEvent(new CustomEvent('myerror', { detail:"Error parsing "+url+encodeURIComponent(word) }));
         }
      });
   }
}

class UrbanDictionary extends Dictionary {
   static id() {
     return "Urban Dictionary";
   }

   static fetch(word, cb) {
      var ret = [];
      var url = "https://api.urbandictionary.com/v0/define?term=";

       $.get('./php/proxy.php', {
         csurl: url+encodeURIComponent(encodeURIComponent(word)),
      }).done(function( data ) {
         if(!data["list"]) {
            window.dispatchEvent(new CustomEvent('myerror', { detail:data }));
            return;
         }
         var meanings = data["list"];
         for(var i in meanings) {
            ret.push({
               "definition":meanings[i]["definition"],
               "example":meanings[i]["example"],
               "dictionary":"urban",
            });
         }
         cb(ret);
      }).fail(function(e) {
         if(e.status == 404) {
            cb();
         } else {
            window.dispatchEvent(new CustomEvent('myerror', { detail:"Error parsing "+url+encodeURIComponent(encodeURIComponent(word)) }));
         }
      });
   }
}

class ReversoDictionary extends Dictionary {
   static id() {
      return "Reverso";
   }

   static fetch(word, cb, first = 1) {
      var ret = [];
      /* Reverso has this weird rule of wanting '+' instead of ' ' in urls.
       * The issue is that some browsers automatically replace '+' with ' ' and so we end in a redirect hell.
       * For now, replace '+' with '*' and then let the proxy revert back to '+'...*/
      var url = "https://context.reverso.net/translation/english-french/";
      $.get('./php/proxy.php', {
         csurl: url+encodeURIComponent(encodeURIComponent(word.replace(/ /g, '*'))),
      }).done(function(data) {
         var html = $($.parseHTML(data));
         if(!html.find(".src.ltr").length) {
            cb();
            return;
         }
         html.find(".src.ltr").each(function(id, el) {
            var content = $(el).parent();
            content.find('a').contents().unwrap();
            ret.push({
               "definition":content.find(".src.ltr").html(),
               "example":content.find(".trg.ltr").html(),
               "dictionary":"reverso",
            });
         });
         cb(ret);
      }).fail(function(e) {
         if(e.status == 301 && first) {
            // Retry once, sometimes reverso does a 301 on the 1st query for some reason...
            ReversoDictionary.fetch(word, cb, 0);
         } else if(e.status == 404) {
            cb();
         } else {
            window.dispatchEvent(new CustomEvent('myerror', { detail:"Error parsing "+url+encodeURIComponent(encodeURIComponent(word.replace(/ /g, '*'))) }));
         }
      });
   }
}

class OxfordDictionary extends Dictionary {
   static id() {
     return "Oxford Dictionary";
   }

   static fetch(word, cb) {
      var ret = [];
      var url = "./php/oxford.php?word=";
      $.getJSON(url+encodeURIComponent(encodeURIComponent(word))).done(function( data ) {
         if(data["error"]) {
            if(data["error"].match("No entry found")) {
               cb();
            } else {
               window.dispatchEvent(new CustomEvent('myerror', { detail:data["error"] }));
            }
            return;
         }

         var results = data["results"];
         for(var i in results) {
            var entries = results[i]["lexicalEntries"];
            for(var j in entries) {
               var subentries = entries[j]["entries"];
               for(var k in subentries) {
                  var senses = subentries[k]["senses"];
                  for(var s in senses) {
                     if(!senses[s]["definitions"])
                        continue;
                     
                     var def  = ({
                        "definition":senses[s]["definitions"][0],
                        "dictionary":"oxford",
                     });

                     if(senses[s]["examples"])
                        def["example"] = senses[s]["examples"].map(function(elem){ return elem.text; }).join("<br/>");

                     if(senses[s]["synonyms"])
                        def["synonyms"] = senses[s]["synonyms"].map(function(elem){ return elem.text; });

                     if(senses[s]["regions"])
                        def["regions"] = senses[s]["regions"].map(function(elem){ return elem.text; }).join(", ");

                     if(senses[s]["registers"])
                        def["registers"] = senses[s]["registers"].map(function(elem){ return elem.text; }).join(", ");

                     ret.push(def);
                  }
               }
            }
         }
         cb(ret);
      }).fail(function(e) {
         if(e.status == 404) {
            cb();
         } else {
            window.dispatchEvent(new CustomEvent('myerror', { detail:"Error parsing "+url+encodeURIComponent(encodeURIComponent(word)) }));
         }
      });
   }
}

var ReversoTranslationsDictionaryCache = {};
class ReversoTranslationsDictionary extends Dictionary {
   static id() {
      return "Reverso";
   }

   static fetch(word, cb, first = 1) {
      if(ReversoTranslationsDictionaryCache[word])
         return cb(ReversoTranslationsDictionaryCache[word]);

      var ret = {
         translations:[],
         examples:[]
      };
      var url = "https://context.reverso.net/translation/french-english/";
      $.get('./php/proxy.php', {
         csurl: url+encodeURIComponent(encodeURIComponent(word.replace(/ /g, '*'))), // see ReversoDictionary
      }).done(function(data) {
         var html = $($.parseHTML(data));
         if(!html.find(".translation.ltr.dict").length) {
            cb(ret);
            return;
         }
         html.find(".translation.ltr.dict").each(function(id, el) {
            ret["translations"].push($(el).text().replace(/\n/g,'').trim());
         });
         html.find(".src.ltr").each(function(id, el) {
            var content = $(el).parent();
            content.find('a').contents().unwrap();
            ret["examples"].push({
               "orig":content.find(".src.ltr").html(),
               "trans":content.find(".trg.ltr").html(),
            });
         });
         ReversoTranslationsDictionaryCache[word] = ret;
         cb(ret);
      }).fail(function(e) {
         if(e.status == 404 && first) {
            // Retry once, sometimes reverso does a 301 on the 1st query for some reason...
            ReversoTranslationsDictionary.fetch(word, cb, 0);
         } else if(e.status == 404) {
            cb();
         } else {
            window.dispatchEvent(new CustomEvent('myerror', { detail:"Error parsing "+url+encodeURIComponent(encodeURIComponent(word.replace(/ /g, '*'))) }));
         }
      });
   }
}

class StarDict extends Dictionary {
   static id() {
     return "StarDict Dictionary";
   }

   static fetch(word, cb) {
      var url = "./php/stardict.php?word=";
       $.get(url+encodeURIComponent(word)).done(function( data ) {
         cb([{
               "definition":data,
               "dictionary":"stardict",
         }]);
      }).fail(function(e) {
         window.dispatchEvent(new CustomEvent('myerror', { detail: "Error parsing " + url + encodeURIComponent(encodeURIComponent(word.replace(/ /g, '*'))) }));
      });
   }
}

var dicts = {
   "api":ApiDictionary,
   //"oxford":OxfordDictionary,
   "reverso": ReversoDictionary,
   "urban": UrbanDictionary,
   "stardict": StarDict,
};
var defaultDict = "api";
