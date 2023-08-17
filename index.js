import http from "http";

const express = require("express");
const axios = require("axios").default;
const cors = require("cors");

const app = express();
const port = 2096;

const mysql = require("mysql2/promise");
require("dotenv").config();

const crypto = require("crypto");

const mySalt = process.env.mySALT;

app.use(cors());
app.use(express.json());

var connection;

const ERROR_USER_INVALID = 101;
const ERROR_MISSING_VALUE = 102;

const ERROR_RESULT_INVALID = 201;
const ERROR_DUPLICATE_DATA = 202;
const ERROR_DUPLICATE_DATA_ID = 203;
const ERROR_DUPLICATE_DATA_EMAIL = 204;
const ERROR_DUPLICATE_DATA_NICKNAME = 205;

const ERROR_DB_INVALID = 301;
const ERORR_BAD_REQUEST = 302;

async function init() {
    connection = await mysql.createConnection({
        host: process.env.DB_SERVER_ADDR,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB,
    });

    console.log("DB Connection successful?:", connection != null);
}

init();

app.post("/login", loginHandler);
async function loginHandler(req, res) {
    if (connection == null) {
        return res.status(500).json({
            errorCode: ERROR_DB_INVALID,
            error: "DB connection failed",
        });
    }

    let fetchedID = req.body.id ?? "";
    let fetchedPW = req.body.pw ?? "";

    if (fetchedID === "" || fetchedPW === "") {
        return res.status(400).json({
            errorCode: ERROR_USER_INVALID,
            error: "ID or password is missing",
        });
    }

    fetchedPW = crypto
        .createHash("sha256")
        .update(fetchedPW + mySalt)
        .digest("hex");

    let [result] = await connection.query(
        "SELECT * FROM `board_account` WHERE `user_id`=? AND `user_pw`=?",
        [fetchedID, fetchedPW]
    );

    if (result.length == 0) {
        return res.status(400).json({
            errorCode: ERROR_USER_INVALID,
            error: "ID or password is missing",
        });
    }

    let loggedInfo = result[0];

    let randomizedToken =
        fetchedID + Math.random().toString() + new Date().getDate().toString();
    randomizedToken = crypto
        .createHash("sha256")
        .update(randomizedToken)
        .digest("hex");

    await connection.query(
        "INSERT INTO `token` (`account_id`,`token`) VALUES (?,?)",
        [loggedInfo.id, randomizedToken]
    );
    return res.status(200).json({
        token: randomizedToken,
    });
}

app.get("/userInfo", userInfoHandler);
async function userInfoHandler(req, res) {
    if (connection == null) {
        return res.status(500).json({
            errorCode: ERROR_DB_INVALID,
            error: "DB connection failed",
        });
    }

    let userInfo = await auth(req);

    if (userInfo == null) {
        return res.status(401).json({
            errorCode: ERROR_RESULT_INVALID,
            error: "Result Not Found",
        });
    }

    res.send({
        user_id: userInfo.user_id,
        nickname: userInfo.nickname,
        email: userInfo.email,
    });
}

async function auth(req) {
    let fetchedToken = req.headers["authorization"];

    if (fetchedToken == null) {
        return null;
    }

    let [fetchedTokenID] = await connection.query(
        "SELECT * FROM `token` WHERE `token`=?",
        [fetchedToken]
    );
    if (fetchedTokenID.length == 0) {
        return null;
    }

    let result = await getAccount(fetchedTokenID[0].account_id);

    if (result == null) {
        return null;
    }
    return result;
}

async function getAccount(accountID) {
    let [result] = await connection.query(
        "SELECT * FROM `board_account` WHERE `id`=?",
        [accountID]
    );

    if (result.length == 0) {
        return null;
    }

    return result[0];
}

app.post("/join", joinHandler);
async function joinHandler(req, res) {
    if (connection == null) {
        return res.status(500).json({
            errorCode: ERROR_DB_INVALID,
            error: "DB connection failed",
        });
    }

    let fetchedID = req.body.id ?? "";
    let fetchedPW = req.body.pw ?? "";
    let fetchedEmail = req.body.email ?? "";
    let fetchedNickname = req.body.name ?? "";

    if (
        fetchedID === "" ||
        fetchedPW === "" ||
        fetchedEmail === "" ||
        fetchedNickname === ""
    ) {
        return res.status(400).json({
            errorCode: ERROR_MISSING_VALUE,
            error: "Missing Value",
        });
    }

    let [result] = await connection.query(
        "SELECT * FROM `board_account` WHERE `user_id`=? OR `email`=? OR `nickname`=?",
        [fetchedID, fetchedEmail, fetchedNickname]
    );

    if (result.length != 0) {
        let resultData = result[0];

        if (resultData.user_id == fetchedID)
            return res.status(400).json({
                errorCode: ERROR_DUPLICATE_DATA_ID,
                error: "User already exists",
            });
        if (resultData.email == fetchedEmail)
            return res.status(400).json({
                errorCode: ERROR_DUPLICATE_DATA_EMAIL,
                error: "Email already exists",
            });
        if (resultData.nickname == fetchedNickname)
            return res.status(400).json({
                errorCode: ERROR_DUPLICATE_DATA_NICKNAME,
                error: "Nickname already exists",
            });

        return res.status(400).json({
            errorCode: ERORR_BAD_REQUEST,
            error: "Bad Request",
        });
    }

    fetchedPW = crypto
        .createHash("sha256")
        .update(fetchedPW + mySalt)
        .digest("hex");

    await connection.query(
        "INSERT INTO `board_account` (`user_id`, `user_pw`, `email`, `nickname`) VALUES (?,?,?,?)",
        [fetchedID, fetchedPW, fetchedEmail, fetchedNickname]
    );

    return res.status(200).json({
        success: true,
    });
}

app.post("/write", writePostHandler);
async function writePostHandler(req, res) {
    if (connection == null) {
        return res.status(500).json({
            errorCode: ERROR_DB_INVALID,
            error: "DB connection failed",
        });
    }

    let userInfo = await auth(req);

    if (userInfo == null) {
        return res.status(401).json({
            errorCode: ERROR_RESULT_INVALID,
            error: "Result does not found",
        });
    }

    let fetchedTitle = req.body.title ?? "";
    let fetchedContent = req.body.content ?? "";
    let fetchedCategory = req.body.category ?? "";
    let fetchedID = userInfo.id ?? "";

    if (
        fetchedTitle === "" ||
        fetchedContent === "" ||
        fetchedCategory === "" ||
        fetchedID === ""
    ) {
        return res.status(400).json({
            errorCode: ERROR_MISSING_VALUE,
            error: "Missing Value",
        });
    }

    await connection.query(
        "INSERT INTO `board` (`title`, `content`, `writer_id`, `category`) VALUES (?,?,?,?)",
        [fetchedTitle, fetchedContent, fetchedID, fetchedCategory]
    );

    return res.status(200).json({
        success: true,
    });
}

app.get("/read", readPostHandler);
async function readPostHandler(req, res) {
    if (connection == null) {
        return res.status(500).json({
            errorCode: ERROR_DB_INVALID,
            error: "DB connection failed",
        });
    }

    let fetchedID = req.query.id ?? "";

    if (fetchedID === "") {
        return res.status(400).json({
            errorCode: ERROR_USER_INVALID,
            error: "ID is missing",
        });
    }

    let [result] = await connection.query(
        "SELECT * FROM `board` WHERE `id`=?",
        [fetchedID]
    );

    if (result.length == 0) {
        return res.status(404).json({
            ERROR_RESULT_INVALID,
            error: "Result Not Found",
        });
    }

    if (result.length == 0) {
        return res.status(404).json({
            errorCode: ERROR_RESULT_INVALID,
            error: "Result Not Found",
        });
    }

    let contentInfo = result[0];

    let fetchedUserId = contentInfo.writer_id;

    let userInfo = await getAccount(fetchedUserId);

    if (userInfo == null) {
        return res.status(404).json({
            errorCode: ERROR_RESULT_INVALID,
            error: "Result Not Found",
        });
    }

    return res.status(200).json({
        writer_id: contentInfo.writer_id,
        name: userInfo.nickname,
        time: contentInfo.written_time,
        title: contentInfo.title,
        content: contentInfo.content,
    });
}

app.get("/board", boardHandler);
async function boardHandler(req, res) {
    if (connection == null) {
        return res.status(500).json({
            errorCode: ERROR_DB_INVALID,
            error: "DB connection failed",
        });
    }

    let fetchedCategory = req.query.category;

    if (fetchedCategory == null || fetchedCategory == "") {
        return res.status(400).json({
            errorCode: ERROR_MISSING_VALUE,
            error: "Category is missing",
        });
    }

    let fetchedPageNumber = (req.query.page - 1) * 10;
    let fetchedPageLimit = 10;

    if (fetchedPageNumber == null || fetchedPageLimit == null) {
        return res.status(400).json({
            errorCode: ERROR_MISSING_VALUE,
            error: "Page is missing",
        });
    }

    if (fetchedPageNumber < 0) {
        fetchedPageNumber = 0;
    }

    let [result] = await connection.query(
        "SELECT * FROM `board` WHERE `category`=? ORDER BY `written_time` DESC LIMIT ?,?",
        [fetchedCategory, fetchedPageNumber, fetchedPageLimit]
    );

    if (result.length == 0) {
        return res.status(200).json({
            total: 0,
            array: [],
        });
    }

    let resultArray = [];

    for (let i = 0; i < result.length; i++) {
        let targetUser = await getAccount(result[i].writer_id);

        if (targetUser == null) {
            continue;
        }

        resultArray.push({
            id: result[i].id,
            writer: targetUser.nickname,
            title: result[i].title,
            content: result[i].content,
            written_time: result[i].written_time,
        });
    }

    if (resultArray.length == 0) {
        return res.status(400).json({
            errorCode: ERROR_RESULT_INVALID,
            error: "Result NOT found",
        });
    }

    let [total] = await connection.query(
        "SELECT COUNT(*) AS `count` FROM `board` WHERE `category`=?",
        [fetchedCategory]
    );

    if (total.length == 0) {
        return res.status(400).json({
            errorCode: ERROR_RESULT_INVALID,
            error: "Result Not found",
        });
    }

    let totalValue = total[0].count;

    return res.status(200).json({
        total: totalValue,
        array: resultArray,
    });
}

if (process.env.PRODUCTION == "1") {
    const options = {
        key: fs.readFileSync("./keys/pk.pem"),
        cert: fs.readFileSync("./keys/fc.pem"),
    };

    let server = https.createServer(options, app);

    server.listen(port, () => {
        console.log(`Example app listening on port ${port}`);
    });
} else {
    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`);
    });
}
