var express = require('express');
var fs = require("fs");
var request = require("request");
var async = require("async");

var app = express();

app.use(express.static('public'));

app.set('port', (process.env.PORT || 5000));

app.get('/', function (req, res) {
    console.log("Got a GET request for the homepage");
    res.sendFile(__dirname + "/" + "index.html");
});

app.get('/checkMailItemsStatus', function (req, res) {
    var filePath = req.query.mail_items_file;
    console.log("File path is: " + filePath);

    var data = fs.readFileSync(filePath);
    var dataAsString = data.toString();
    var itemsArr = dataAsString.split(",");
    console.log("Processing data file...");

    checkMailItemsStatusByIsraelPost(itemsArr, res);
    //checkMailItemsStatusBy17Track(itemsArr, res);
});

function checkMailItemsStatusBy17Track(itemsArr, res) {
    var itemsUpdatedArr = [];
    var responseData = "";

    async.forEach(itemsArr, function (item, callback) {
        var itemDataArr = item.split("=");
        var itemCode = itemDataArr[0];
        var itemTitle = itemDataArr[1];

        request.post({
            headers: {'content-type': 'application/json'},
            url: "http://www.17track.net/restapi/handlertrack.ashx",
            json: {"guid": "", "data": [
                {"num": itemCode}
            ]}
        }, function (error, response, body) {
            console.log(body);
            itemsUpdatedArr.push({itemTitle: itemTitle, itemDetails: body});
            callback();
        });


    }, function (err) {
        console.log("Async calls finished");
        itemsUpdatedArr.forEach(function (entry) {
            var itemTitle = entry.itemTitle;
            var mailItemDetails;
            if (entry.itemDetails && entry.itemDetails.dat && entry.itemDetails.dat.length > 0 && entry.itemDetails.dat[0].track) {
                mailItemDetails = entry.itemDetails.dat[0].track;
            }
            if (!mailItemDetails) {
                mailItemDetails = "No information available"
            }
            responseData += "<b>" + itemTitle + "</b>";
            responseData += "</br>";
            responseData += (mailItemDetails.z0 && mailItemDetails.z0.a ? mailItemDetails.z0.a : "N/A") + ": " + (mailItemDetails.z0 && mailItemDetails.z0.z ? mailItemDetails.z0.z : "N/A");
            responseData += "</br>";
            responseData += "</br>";
        });

        console.log("Sending output result");
        res.send(responseData);
    });
}

function checkMailItemsStatusByIsraelPost(itemsArr, res) {
    var itemsUpdatedArr = [];
    var responseData = "";

    async.forEach(itemsArr, function (item, callback) {
        var itemDataArr = item.split("=");
        var itemCode = itemDataArr[0];
        var itemTitle = itemDataArr[1];

        request({
            uri: "http://www.israelpost.co.il/itemtrace.nsf/trackandtraceJSON?openagent&lang=EN&itemcode=" + itemCode,
            method: "GET",
            timeout: 10000,
            followRedirect: true,
            maxRedirects: 10
        }, function (error, response, body) {
            itemsUpdatedArr.push({itemTitle: itemTitle, itemCode:itemCode, itemDetails: body});
            callback();
        });

    }, function (err) {
        console.log("Async calls finished");
        itemsUpdatedArr.forEach(function (entry) {
            var itemTitle = entry.itemTitle;
            var itemCode = entry.itemCode;
            var mailItemDetails = JSON.parse(entry.itemDetails);

            var content = formatData(mailItemDetails.itemcodeinfo);

            responseData += "<b>Item Name:</b> " + itemTitle + "</br>";
            responseData += "<b>Item Code:</b> " + itemCode + "</br>";
            responseData += "<b>Item Details:</b> </br>";
            responseData += content;
            responseData += "</br></br>";

        });

        console.log("Sending output result");
        res.send(responseData);
    });
}

function formatData(itemData) {

    if (itemData.indexOf("There is no information") == -1) {
        itemData = itemData.substring(0, itemData.indexOf("<script"));

        var arr = itemData.split("<tr");
        var tempArr = arr[1].split("</");
        var titleArr = [];
        var valArrs = [];
        var returnStr = "";

        tempArr.forEach(function (entry) {
            entry = entry.substring(entry.lastIndexOf(">") + 1);
            if (entry.length > 0) {
                titleArr.push(entry);
            }
        });

        console.log(titleArr);

        for (var i = 2; i < arr.length; i++) {
            var valArr = [];
            tempArr = arr[i].split("</td>");
            tempArr.forEach(function (entry) {
                entry = entry.substring(entry.lastIndexOf(">") + 1);
                if (entry.length > 0) {
                    valArr.push(entry);
                }
            });
            valArrs.push(valArr);
        }

        returnStr += "<table border='1'><tr>";

        titleArr.forEach(function (entry) {
            returnStr = returnStr + "<th>" + entry + "</th>";
        });
        returnStr = returnStr + "</tr>";

        valArrs.forEach(function (arr) {
            returnStr = returnStr + "<tr>";
            arr.forEach(function (entry) {
                returnStr = returnStr + "<td>" + entry + "</td>";
            });
            returnStr = returnStr + "</tr>";
        });
        returnStr = returnStr + "</table>";
        return returnStr;
    } else {
        return "There is no information";
    }
}

app.listen(app.get('port'), function () {
    console.log('Node app is running on port', app.get('port'));
});

//var server = app.listen(8081, function () {
//   var host = server.address().address
//   var port = server.address().port

//   console.log("Server listening at http://%s:%s", host, port)
//});
