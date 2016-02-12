'use strict';

module.exports.data = function(context, callback){

  var acL = context.acceptLanguage;

  if(!!acL && !!acL.length && acL.length > 0){
    acL = acL[0].code;
  } else {
    acL = 'en';
  }

  var languages = {
    en: 'english',
    ja: 'japanese'
  };

  callback(null, {
    language: languages[!!languages[acL] ? acL : 'en']
  });
};