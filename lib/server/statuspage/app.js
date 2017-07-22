/* eslint-disable */
var STATUS;

function CreateNewSocket($scope) {
  const wsUrl = window.location.origin.replace(/^http/, 'ws') + '/__martinet__/ws';
  console.log('Establishing connection to', wsUrl);

  if ($scope.$ws) {
    try {
      $scope.$ws.close();
    } catch (e) {
      console.error(e);
    }
  }
  var ws = $scope.$ws = new WebSocket(wsUrl);

  ws.addEventListener('open', function() {
    CreateNewSocket.backoffMs = 150;
    console.log('Connection opened.');
  });

  ws.addEventListener('message', function(msgEvt) {
    const msgData = JSON.parse(msgEvt.data);
    setTimeout(function() {
      $scope.$apply(function() {
        $scope.state = msgData;
        STATUS = msgData;
      });
    }, 50);
  });

  ws.addEventListener('close', function() {
    var nbf = CreateNewSocket.backoffMs;
    CreateNewSocket.backoffMs = nbf = Math.min(nbf * 2, 5000);
    console.log('Connection dropped, trying again in', nbf);
    setTimeout(function() { CreateNewSocket($scope); }, nbf);
  });
}


function MainCtrl($scope) {
  var backoffMs = 150;

  // Copy URL parameters into search.params.
  var searchParams = (window.location.search || '').substr(1).split('&');
  var params = {};
  for (var i = 0; i < searchParams.length; i++) {
    var paramPair = searchParams[i].split('=');
    params[paramPair[0]] = decodeURIComponent(paramPair[1]);
  }
  $scope.params = params;

  // Connect to backend server.
  CreateNewSocket($scope);
}

MainCtrl.prototype.setPageDetail = function(pageDist) {
  try {
    this.pageDetails = STATUS.build.pageStates[pageDist];
  } catch (e) {
    console.warn(e);
    return;
  }
};


angular
  .module('app', [])
  .controller('MainCtrl', MainCtrl);
