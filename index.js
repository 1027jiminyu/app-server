const http = require("http");
const express = require("express");
const io = require("socket.io");
const app = express();
const mysql = require("mysql");
const PORT = 3001; //포트 설정
const admin = require("firebase-admin");
const { google } = require("googleapis");

//FCM config
const PROJECT_ID = "inent-650b3";
const HOST = "fcm.googleapis.com";
const PATH = "/v1/projects/" + PROJECT_ID + "/messages:send";
const MESSAGING_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const SCOPES = [MESSAGING_SCOPE];

const cors = require("cors");
app.use(cors());

//FCM auth token 가져오기
function getAccessToken() {
  return new Promise(function (resolve, reject) {
    const key = require("./serviceAccountKey.json/inent-650b3-firebase-adminsdk-5i50k-fd5776026f.json");
    const jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      SCOPES,
      null
    );
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        reject(err);
        return;
      }
      resolve(tokens.access_token);
    });
  });
}

//00초(분) 타이머
const interval = setInterval(() => {
  console.log("Interval triggered");
  const database = new Database(dbConfig); //DB접속

  //최근 알림 리스트 가져오기
  database
    .query(
      `SELECT b.userid,a.name,a.value,a.times,b.token
        FROM alertlists as A
          INNER JOIN fcmtokens as B
            ON A.userid = B.userid
            WHERE a.times >= date_add(now(), interval -1 minute)`
    )
    .then(async (rows) => {
      try {
        // //쿼리 결과 값이 존재하면 FCM 메세지 전송
        // rows.length !== 0 && sendMessages(rows);
        //-------------------------------------------------
        console.log("쿼리 결과:", rows); // 쿼리 결과를 로그로 출력해 확인
        if (rows.length !== 0) {
          await sendMessages(rows);
          console.log("메세지를 전송 성공");
        } else {
          console.log("새로 보낼 알림이 없음");
        }
      } catch {
        //오류
        console.log("에러");
      } finally {
        database.close(); //DB닫아주기
      }
    });
}, 30000);

// async function sendMessages(list) {
//   const Token = await getAccessToken();
//   console.log(Token);
//   for (var i = 0; i < list.length; i++) {
//     console.log(list[i].token);
//     fetch(`https://${HOST + PATH}`, {
//       method: "POST",
//       headers: {
//         Authorization: "Bearer " + Token,
//       },
//       body: JSON.stringify({
//         message: {
//           token: list[i].token,
//           data: {
//             body: list[i].value,
//             title: list[i].name,
//           },
//           android: {
//             priority: "high",
//           },
//           fcmOptions: {
//             analyticsLabel: "DataMessage",
//           },
//         },
//       }),
//     }).catch((error) => console.log(error));
//     //-------------------------------------------------
//     console.log(
//       "Sending message to token: ",
//       list[i].token,
//       "with data:",
//       message
//     ); // 메시지 정보 로그 출력
//   }
// }
async function sendMessages(list) {
  try {
    const Token = await getAccessToken();
    console.log("액세스 토큰:", Token);

    for (let i = 0; i < list.length; i++) {
      console.log("토큰으로 메시지 전송 중:", list[i].token);

      try {
        const response = await fetch(`https://${HOST + PATH}`, {
          method: "POST",
          headers: {
            Authorization: "Bearer " + Token,
            "Content-Type": "application/json", // 이 부분이 빠져 있을 수 있으므로 추가합니다.
          },
          body: JSON.stringify({
            message: {
              token: list[i].token,
              data: {
                body: list[i].value,
                title: list[i].name,
              },
              android: {
                priority: "high",
              },
              fcmOptions: {
                analyticsLabel: "DataMessage",
              },
            },
          }),
        });

        if (!response.ok) {
          console.log("메시지 전송 실패:", await response.text());
        } else {
          console.log("토큰으로 메시지 성공적으로 전송:", list[i].token);
        }
      } catch (error) {
        console.log("메시지 전송 중 오류:", error);
      }
    }
  } catch (error) {
    console.log("endMessages에서 오류 발생:", error);
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//로그인시 해당 계정의 아이디와 장비TOKEN 받기
// app.post("/api/token", (req, res) => {
//   const item = req.body;
//   if (item.userid && item.token) {
//     const database = new Database(dbConfig);

//     //userid와 장비의 TOKEN 중복되면 NOT INSERT
//     database
//       .query(
//         `INSERT INTO fcmtokens (userid, token, date)
//         SELECT '${item.userid}','${item.token}',NOW()
//           FROM DUAL
//             WHERE NOT EXISTS
//               (SELECT * FROM fcmtokens where token='${item.token}' AND userid='${item.userid}')`
//       )
//       .then(async (rows) => {
//         try {
//           //console.log(rows);
//         } catch {
//           //오류
//           console.log("err");
//         } finally {
//           database.close(); //DB닫아주기
//         }
//       });
//   }
// });
app.post("/api/token", (req, res) => {
  const item = req.body;
  if (item.userid && item.token) {
    const database = new Database(dbConfig);

    //userid와 장비의 TOKEN 중복되면 NOT INSERT
    database
      .query(
        `INSERT INTO fcmtokens (userid, token, date)  
        SELECT '${item.userid}','${item.token}',NOW()
        FROM DUAL
        WHERE NOT EXISTS 
          (SELECT * FROM fcmtokens WHERE token='${item.token}' AND userid='${item.userid}')`
      )
      .then(async (rows) => {
        try {
          console.log("쿼리가 성공적으로 실행:", rows);
          res.status(200).json({ message: "토큰이 성공적으로 insert", rows });
        } catch (error) {
          console.log("Error:", error);
          res.status(500).json({ message: "토큰 insert 오류", error });
        } finally {
          database.close(); //DB닫아주기
        }
      })
      .catch((error) => {
        console.log("데이터베이스 쿼리 오류:", error);
        res.status(500).json({ message: "데이터베이스 쿼리 오류", error });
        database.close();
      });
  } else {
    res.status(400).json({ message: "잘못된 요청: userid, token 필요" });
  }
});

//DB영역=============================================================
const dbConfig = {
  host: "49.50.165.218",
  user: "con",
  password: "inent!@#",
  database: "odor",
};

class Database {
  constructor(config) {
    this.connection = mysql.createConnection(config);
  }
  query(sql, args) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, args, (err, rows) => {
        if (err) return resolve(err);
        resolve(rows);
      });
    });
  }
  close() {
    return new Promise((resolve, reject) => {
      this.connection.end((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}
//DB영역=============================================================

//비밀번호 암호화 영역=============================================================

function GenerateMySQLHash(key) {
  var crypto = require("crypto");
  var first = crypto.createHash("sha1").update(key).digest("bin");
  var second = crypto.createHash("sha1").update(first).digest("hex");
  return "*" + second.toUpperCase();
}
//비밀번호 암호화 영역=============================================================

const httpServer = http.createServer(app).listen(PORT, () => {
  console.log(`포트 ${PORT}에 연결되었습니다.`);
});

const socketServer = io(httpServer);

socketServer.on("connection", (socket) => {
  const ip =
    socket.request.headers["x-forwarded-for"] ||
    socket.request.connection.remoteAddress; //연결한 IP
  console.log(`${ip}에서 연결`);
  console.log("connect client by Socket.io");

  //소켓 연결 해제
  socket.on("disconnect", (reason) => {
    console.log(`${ip}에서 연결종료`);
  });

  //클라이언트에서 로그인 값 받기
  socket.on("login", (id, pw) => {
    //아이디나 비밀번호가 null값이나 공백이면 클라이언트로 메시지를 보낸다
    if (id === null || id === "") return socket.emit("login_msg", "No id");
    if (pw === null || pw === "") return socket.emit("login_msg", "No pw");
    //sql injection의 문자는 변경
    id = id.replace("'", "injection");
    id = id.replace("=", "injection");
    id = id.replace("--", "injection");
    pw = GenerateMySQLHash(pw); //비밀번호를 암호화
    const database = new Database(dbConfig); //DB접속
    database
      .query(
        `SELECT 
                            userid,username,depart,position,email,phone,role,geocode,pushid,onweb,onmail,onsms,onpush
                        FROM 
                            users 
                        WHERE 
                            userid='${id}' and userpw=?`,
        pw
      )
      .then((rows) => {
        try {
          if (rows.errno) {
            //DB접속 에러
            return socket.emit("login_msg", "No DB");
          }
          //쿼리 결과 값
          socket.emit("login_msg", rows[0]);
        } catch {
          //오류
          socket.emit("login_msg", "err");
        } finally {
          database.close(); //DB닫아주기
        }
      });
  });

  //클라이언트에서 장비 리스트 응답
  socket.on("deviceList", (userid) => {
    const database = new Database(dbConfig); //DB접속
    database
      .query(
        `SELECT 
              A.name, A.id, A.depart, A.addr, A.dev_position, B.userid, A.productid
          FROM 
              devices AS A
          JOIN
              userdevices AS B ON A.macaddr = B.deviceid
          WHERE 
              B.userid='${userid}'
          ORDER BY 
              A.dev_position`
      )
      .then((rows) => {
        try {
          //쿼리 결과 값
          socket.emit("deviceList_msg", rows);
        } catch {
          //오류
          socket.emit("deviceList_msg", "err");
        } finally {
          database.close(); //DB닫아주기
        }
      });
  });

  //클라이언트에서 장비센서정보 응답
  socket.on("deviceData", (deviceid) => {
    const database = new Database(dbConfig); //DB접속
    database
      .query(
        `SELECT 
              nh3,h2s,voc,odor,airt,spd,tmp,hum,sensingDt,deviceid
          FROM 
              monitors 
          WHERE 
              deviceid="${deviceid}" 
          ORDER BY 
              sensingDt desc 
          LIMIT 
              0,10`
      )
      .then((rows) => {
        try {
          //쿼리 결과 값
          // console.log(rows);
          socket.emit("deviceData_msg", rows);
        } catch {
          //오류
          socket.emit("deviceData_msg", "err");
        } finally {
          database.close(); //DB닫아주기
        }
      });
  });

  //클라이언트에서 장비센서 최신정보 응답
  socket.on("recentData", (id) => {
    const database = new Database(dbConfig); //DB접속
    database
      .query(
        `SELECT 
            d.id AS deviceid
            ,ifnull(r.nh3      ,0) AS nh3      
            ,ifnull(r.h2s      ,0) AS h2s      
            ,ifnull(r.voc      ,0) AS voc
            ,ifnull(r.odor      ,0) AS odor
            ,ifnull(r.silution   ,0) AS silution   
            ,ifnull(r.solidity   ,0) AS solidity                         
            ,ifnull(r.sensingDt   ,0) AS sensingDt
            ,ifnull(m.tmp   ,0) AS tmp
            ,ifnull(m.hum   ,0) AS hum
            ,ifnull(m.spd   ,0) AS spd
            ,ifnull(m.airt   ,0) AS airt
            ,ifnull(d.lati   ,0) AS lati
            ,ifnull(d.longi   ,0) AS longi
          FROM userdevices AS c 
          LEFT JOIN devices AS d ON c.deviceid = d.id
          LEFT JOIN products AS p ON d.productid = p.id
          LEFT JOIN monitors AS m ON p.id = m.deviceid
          LEFT JOIN recents AS r ON r.id = (SELECT MAX(id) FROM recents WHERE deviceid=d.id)
          WHERE userid='${id}'
          ORDER BY d.dev_position`
      )
      .then((rows) => {
        try {
          //쿼리 결과 값
          // console.log(rows);
          socket.emit("recentData_msg", rows);
        } catch {
          //오류
          socket.emit("recentData_msg", "err");
        } finally {
          database.close(); //DB닫아주기
        }
      });
  });

  //클라이언트에서 장비정보 응답
  socket.on("deviceInfo", (deviceid) => {
    const database = new Database(dbConfig); //DB접속
    database
      .query(
        `SELECT 
              * 
          FROM 
              devices 
          WHERE 
              id="${deviceid}"`
      )
      .then((rows) => {
        try {
          //쿼리 결과 값
          socket.emit("deviceInfo_msg", rows[0]);
        } catch {
          //오류
          socket.emit("deviceInfo_msg", "err");
        } finally {
          database.close(); //DB닫아주기
        }
      });
  });

  //클라이언트에서 새로고침 시 응답
  socket.on("Refresh", (id) => {
    const database = new Database(dbConfig); //DB접속
    database
      .query(
        `SELECT 
              * 
          FROM 
              users 
          WHERE 
              userid="${id}"`
      )
      .then((rows) => {
        try {
          //쿼리 결과 값
          socket.emit("Refresh_msg", rows[0]);
        } catch {
          //오류
          socket.emit("Refresh_msg", "err");
        } finally {
          database.close(); //DB닫아주기
        }
      });
  });

  //알림리스트
  socket.on("Alertlists", (userid) => {
    const database = new Database(dbConfig); //DB접속
    database
      .query(
        // `SELECT * FROM alertlists WHERE userid="${userid}" AND times >= date_add(now(), interval -1 minute)`
        // `SELECT * FROM alertlists WHERE userid="${userid}"`
        `SELECT alertlists.*, alertusers.userid
          FROM alertlists
          INNER JOIN alertusers
          ON alertlists.userid = alertusers.userid
          WHERE alertlists.userid = "${userid}" 
          ORDER BY times DESC
          LIMIT 100`
      )
      .then((rows) => {
        try {
          //쿼리 결과 값
          socket.emit("Alertlists_msg", rows);
        } catch {
          //오류
          socket.emit("Alertlists_msg", "err");
        } finally {
          database.close(); //DB닫아주기
        }
      });
  });
  //실시간 알림
  socket.on("RecentAlert", (userid) => {
    const database = new Database(dbConfig); //DB접속
    database
      .query(
        `SELECT * FROM alertlists 
          WHERE userid="${userid}" 
          AND times >= date_add(now(), interval -1 minute)`
      )
      .then((rows) => {
        try {
          //쿼리 결과 값
          socket.emit("RecentAlert_msg", rows[0]);
        } catch {
          //오류
          socket.emit("RecentAlert_msg", "err");
        } finally {
          database.close(); //DB닫아주기
        }
      });
  });

  //날씨
  socket.on("Weather", (deviceid) => {
    const database = new Database(dbConfig); //DB접속
    database
      .query(
        `SELECT devices.macaddr, weathers.*
          FROM devices
          INNER JOIN weathers
          ON devices.macaddr = weathers.deviceid
          WHERE devices.macaddr = "${deviceid}"`
      )
      .then((rows) => {
        try {
          //쿼리 결과 값
          socket.emit("Weather_msg", rows[0]);
        } catch {
          //오류
          socket.emit("Weather_msg", "err");
        } finally {
          database.close(); //DB닫아주기
        }
      });
  });

  //예측 데이터
  socket.on("Predict", (deviceid) => {
    const database = new Database(dbConfig); //DB접속
    database
      .query(
        `SELECT pred_val, yvar_name, device_id
          FROM pred_results
          WHERE device_id = "${deviceid}"
            AND pred_time = STR_TO_DATE(DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00'), '%Y-%m-%d %H:%i:%s')`
      )
      .then((rows) => {
        try {
          //쿼리 결과 값
          socket.emit("Predict_msg", rows[0]);
        } catch {
          //오류
          socket.emit("Predict_msg", "err");
        } finally {
          database.close(); //DB닫아주기
        }
      });
  });
});

//SMS 영역=============================================================
// const accountSid = "AC3d3322e6afae52cf8655ef2f05cefa8c";
// const authToken = "daf654869fdce5d091a1e37d1ad4c049";
// const client = require("twilio")(accountSid, authToken);

// function sendMessage() {
//   client.messages
//     .create({
//       body: "테스트",
//       from: "+19524794838",
//       to: "+8210",
//     })
//     .then((message) => console.log(message.sid))
//     .catch((error) => console.error(error));
// }

//알림 영역=============================================================

// Firebase Admin 초기화
const serviceAccount = require("./serviceAccountKey.json/inent-650b3-firebase-adminsdk-5i50k-fd5776026f.json"); // Firebase 콘솔에서 다운로드한 서비스 계정 키의 경로
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(express.json());

app.post("/message", (req, res) => {
  const { title, body, token } = req.body; // 클라이언트에서 보낸 데이터 추출
  console.log("Received message:", title, body, token);

  // FCM 메시지 생성
  const message = {
    token: token,
    notification: {
      title: title,
      body: body,
    },
  };

  // FCM을 통해 메시지 보내기
  admin
    .messaging()
    .send(message)
    .then((response) => {
      console.log("Successfully sent message:", response);
      res.status(200).json({ message: "Notification sent successfully" });
    })
    .catch((error) => {
      console.error("Error sending message:", error);
      res
        .status(500)
        .json({ error: `Failed to send notification: ${error.message}` });
    });
});

//-----------------------------------------------------------------

// socketServer.on("connection", (socket) => {
//   console.log("클라이언트가 연결되었습니다.");

//   // 토큰 수신 이벤트 처리
//   socket.on("token", (token) => {
//     console.log("토큰을 받았습니다:", token);
//     sendNotificationToFirebase(
//       token,
//       "악취 모니터링 및 제어 시스템",
//       `알림이 있습니다`
//     );
//   });

//   // 클라이언트와의 연결 종료 이벤트 처리
//   socket.on("disconnect", () => {
//     console.log("클라이언트와의 연결이 종료되었습니다.");
//   });
// });

// // Firebase로 알림 전송
// function sendNotificationToFirebase(token, title, body) {
//   const notification = {
//     title: title,
//     body: body,
//   };

//   admin
//     .messaging()
//     .send({
//       notification: {
//         notification: notification,
//       },
//       token: token,
//     })
//     .then((response) => {
//       console.log("알림 메시지를 Firebase 서버에 전송 성공:", response);
//     })
//     .catch((error) => {
//       console.log("알림 메시지를 Firebase 서버에 전송 실패:", error);
//     });

//   // 클라이언트로 알림 메시지 전송
//   socketServer.emit("notification", notification);
// }
