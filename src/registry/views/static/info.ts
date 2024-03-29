export default `
var oc = oc || {};
oc.cmd = oc.cmd || [];

oc.cmd.push(function() {
  $('#versions').change(function() {
    window.location = thisComponentHref + $(this).val() + '/~info';
  });

  var refreshPreview = function() {
    var splitted = $('#href')
        .val()
        .split('?'),
      url = splitted[0],
      lang = $('#lang').val();

    if (url.slice(-1) !== '/') {
      url += '/';
    }

    url = url.replace('http://', '//').replace('https://', '//');
    url += '~preview/?__ocAcceptLanguage=' + lang + '&';

    if (splitted.length > 1) {
      url += splitted[1];
    }

    $('.preview').attr('src', url);

    return false;
  };
  $('.refresh-preview').click(refreshPreview);

  $('.open-preview').click(function() {
    refreshPreview();
    var url = $('.preview').attr('src');

    window.open(url, '_blank');
    return false;
  });


});`;
