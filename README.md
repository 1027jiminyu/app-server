- socketIO 통신 확인 방법

  1.postman프로그램 설치

  2.new -> WebSocket Request -> 좌측 상단에 Raw를 socket.io로 변경

  3.ws://ip:port 입력 ex)ws://127.0.0.1:3001 후 Connect

  4.Events 클릭 후 보내고 받는 emit명을 입력하고 LISTEN활성화하고 등록
  ex)보내는 emit명이 "login"일 경우 login입력

  5.보내는 변수의 타입과 개수에 따라 Arg를 추가 후 등록한 Events중 보내고 싶은 emit명을 입력하고 데이터 전송
