=== Emitting ===

=======================================

- Client -> Server

```text
("login",id,pw)
```

- Server -> Client

```json
"login_msg",
    {
        "userid": "cksdn858",
        "username": "김찬우",
        "depart": "개발팀",
        "position": "연구원",
        "email": "cksdn858@naver.com",
        "phone": "01000000000",
        "role": "admin",
        "geocode": "11309",
        "token": null,
        "pushid": null,
        "onweb": 1,
        "onmail": 0,
        "onsms": 1,
        "onpush": 0
    }
```

=======================================

=======================================

- Client -> Server

```text
("deviceList",id)
```

- Server -> Client

```json
"deviceList_msg",
    [
        {
            "name":"성지농장-외부-01",
            "targetid":"246F28DAE6C8"
        },
        {
            "name":"성지농장-내부-01",
            "targetid":"F4CFA28B492C"
        }
    ]
```

=======================================

=======================================

- Client -> Server

```text
("deviceData",deviceId)
```

- Server -> Client

```json
"deviceData_msg",
    [
        {
            "h2s": "202",
            "nh3": "261",
            "voc": "-1",
            "odor": "-1"
        },
        {
            "h2s": "207",
            "nh3": "322",
            "voc": "-1",
            "odor": "-1"
        }
    ]
```

=======================================

=======================================

- Client -> Server

```text
("deviceInfo",deviceId)
```

- Server -> Client

```json
"deviceInfo_msg",
    {
        "id": "246F28DAE6C8",
        "productid": "product-id-01",
        "name": "성지농장-외부-01",
        "macaddr": "246F28DAE6C8",
        "addr": "성지농장",
        "depart": "성지농장",
        "geocode": "11309",
        "lati": "36.134110",
        "longi": "127.001508",
        "firmware": "1.7",
        "serverip": "175.208.89.113",
        "serverport": "7000",
        "memo": "",
        "control": "",
        "status": "on",
        "on_nh3": 1,
        "on_h2s": 1,
        "on_odor": 1,
        "on_voc": 0,
        "on_indol": 0,
        "on_temp": 0,
        "on_humi": 0,
        "on_sen1": 0,
        "on_sen2": 0,
        "on_sen3": 0
    }
```

=======================================

=======================================

- Client -> Server

```text
("Refresh",id,pw)
```

- Server -> Client

```json
"Refresh_msg",
    {
        "userid": "cksdn858",
        "username": "김찬우",
        "depart": "개발팀",
        "position": "연구원",
        "email": "cksdn858@naver.com",
        "phone": "01000000000",
        "role": "admin",
        "geocode": "11309",
        "token": null,
        "pushid": null,
        "onweb": 1,
        "onmail": 0,
        "onsms": 1,
        "onpush": 0
    }
```

=======================================
