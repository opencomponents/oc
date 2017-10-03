'use strict';

const getProtocol = url => {
  let protocol;
  return url.split(':')[0];
};

const getHost = url => {
  let hostname;
  //find & remove protocol
  if (url.indexOf('://') > -1) {
    hostname = url.split('/')[2];
  } else {
    hostname = url.split('/')[0];
  }

  //find & remove port number
  hostname = hostname.split(':')[0];
  //find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
};

const getPort = url => {
  let port;
  //find & remove protocol
  const hostnameSplit = url.split(':');
  if (hostnameSplit.length <= 2) {
    return hostnameSplit[0] === 'https' ? 443 : 80;
  }
  //find port number
  port = hostnameSplit[2].split(':')[0];
  //find & remove "?"
  port = port.split('?')[0];
  //find & remove "?"
  port = port.split('/')[0];

  return parseInt(port);
};

module.exports = function(url) {
  return {
    protocol: getProtocol(url),
    hostname: getHost(url),
    port: getPort(url)
  };
};
