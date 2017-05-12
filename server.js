var express = require('express');
var fs = require("fs");
var request = require("request");
var async = require("async");

var app = express();

app.use(express.static('public'));

app.get('/', function (req, res) {
   console.log("Got a GET request for the homepage");
   res.sendFile(__dirname + "/" + "index.html" );
})

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

function checkMailItemsStatusBy17Track(itemsArr, res){
	var itemsUpdatedArr = [];
	var responseData = "";
	
	async.forEach(itemsArr, function (item, callback){ 
		var itemDataArr = item.split("=");
		var itemCode = itemDataArr[0];
		var itemTitle = itemDataArr[1];
		
		request.post({
			headers: {'content-type' : 'application/json'},
			url:"http://www.17track.net/restapi/handlertrack.ashx",
			json:{"guid":"","data":[{"num":itemCode}]}
		}, function(error, response, body){
			console.log(body);
			itemsUpdatedArr.push({itemTitle:itemTitle,itemDetails:body});
			callback();
		});


	}, function(err) {
		console.log("Async calls finished");
		itemsUpdatedArr.forEach(function(entry) {
			var itemTitle = entry.itemTitle;
			var mailItemDetails; 
			if(entry.itemDetails && entry.itemDetails.dat && entry.itemDetails.dat.length > 0 && entry.itemDetails.dat[0].track){
				mailItemDetails = entry.itemDetails.dat[0].track;
			}
			if(!mailItemDetails){
				mailItemDetails = "No information available"
			}
			responseData += "<b>" + itemTitle + "</b>"
			responseData += "</br>";
			responseData += (mailItemDetails.z0 && mailItemDetails.z0.a ? mailItemDetails.z0.a : "N/A") + ": " + (mailItemDetails.z0 && mailItemDetails.z0.z ? mailItemDetails.z0.z : "N/A");
			responseData += "</br>";		
			responseData += "</br>";		
		});
	
		console.log("Sending output result");
		res.send(responseData);
	});
}

function checkMailItemsStatusByIsraelPost(itemsArr, res){
	var itemsUpdatedArr = [];
	var responseData = "";
	
	async.forEach(itemsArr, function (item, callback){ 
		var itemDataArr = item.split("=");
		var itemCode = itemDataArr[0];
		var itemTitle = itemDataArr[1];
		
		request({
			uri: "http://www.israelpost.co.il/itemtrace.nsf/trackandtraceJSON?openagent&lang=EN&itemcode=" + itemCode,
			method: "GET",
			timeout: 10000,
			followRedirect: true,
			maxRedirects: 10
		}, function(error, response, body) {
			itemsUpdatedArr.push({itemTitle:itemTitle,itemDetails:body});
			callback();
		});

	}, function(err) {
		console.log("Async calls finished");
		itemsUpdatedArr.forEach(function(entry) {
			var itemTitle = entry.itemTitle;
			var mailItemDetails = JSON.parse(entry.itemDetails);
			
			responseData += "<b>" + itemTitle + "</b>"
			responseData += "</br>";
			responseData += mailItemDetails.itemcodeinfo;
			responseData += "</br>";		
		});
	
		console.log("Sending output result");
		res.send(responseData);
	});
}



var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Server listening at http://%s:%s", host, port)
})