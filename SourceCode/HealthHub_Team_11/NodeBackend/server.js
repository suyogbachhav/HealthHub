////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////


/// This file and the source code provided can be used only for
/// the projects and assignments of this course

/// Last Edit by Dr. Atef Bader: 8/26/2021



////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
//////////////////////              SETUP NEEDED                ////////////////////
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////

//  Install Nodejs (the bundle includes the npm) from the following website:
//      https://nodejs.org/en/download/


//  Before you start nodejs make sure you install from the
//  command line window/terminal the following packages:
//      1. npm install express
//      2. npm install pg
//      3. npm install pg-format
//      4. npm install moment --save
//      5. npm install elasticsearch


//  Read the docs for the following packages:
//      1. https://node-postgres.com/
//      2.  result API:
//              https://node-postgres.com/api/result
//      3. Nearest Neighbor Search
//              https://postgis.net/workshops/postgis-intro/knn.html
//      4. https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/quick-start.html
//      5. https://momentjs.com/
//      6. http://momentjs.com/docs/#/displaying/format/


////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////


const express = require('express');

//var pg = require('pg');

var bodyParser = require('body-parser');

const moment = require('moment');


// Connect to elasticsearch Server

const elasticsearch = require('elasticsearch');
const esClient = new elasticsearch.Client({
  host: '127.0.0.1:9200',
  log: 'error'
});


console.log("Inside NODE Server");

const app = express();
const router = express.Router();


app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

router.all('*', function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', "Origin, X-Requested-With, Content-Type,Accept, x-client-key, x-client-token, x-client-secret, Authorization");
    next();
});



var places_found = [];
var stations_found = [];
var docks_found = [];
var all_docks_found=[];

var place_selected;
var station_selected;
var allRecords = [];
var isBeginningOfTimeRangeSet = false;

var go_back_in_time_var;
var go_forward_in_time_var;
var time_stamp_var_0;
var time_stamp_var_1;
var time_stamp_var_2;
var time_stamp_var_3;
var time_stamp_var_4;



const PAST_HOUR =  'Past Hour';
const PAST_24_HOURS =  'Last 24 Hours';
const PAST_7_DAYS =  'Last 7 Days';

const SUNDAY    = 0;
const MONDAY    = 1;
const TUESDAY   = 2;
const WEDNESDAY = 3;
const THURSDAY  = 4;
const FRIDAY    = 5;
const SATURDAY  = 6;




var dailyTrips = [];  



/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////

//////   The following are the routes received from NG/Browser client        ////////

/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////



router.route('/places').get((req, res) => {

    res.json(places_found)

});



router.route('/place_selected').get((req, res) => {

    res.json(place_selected)

});

router.route('/station_selected').get((req, res) => {

    res.json(station_selected)

});



router.route('/allPlaces').get((req, res) => {

    res.json(places_found)

});



router.route('/stations').get((req, res) => {

    res.json(stations_found)

});

router.route('/docks').get((req, res) => {


    res.json(docks_found)

});


router.route('/docksSME').get((req, res) => {


  res.json(docks_found)

});




router.route('/places/find').post((req, res) => {
  console.log("Node backend Service '/places/find' function");

    var str = JSON.stringify(req.body, null, 4);


    find_places_from_yelp(req.body.find, req.body.where).then(function (response) {
        var hits = response;
        res.json(places_found);
    });

});




/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////

////////////////////    Yelp - ElasticSerch - Client API            /////////////////

////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////



async function find_places_from_yelp(place, where) {
  console.log("Node Backend inside find_places_from_yelp");

    places_found = [];

//////////////////////////////////////////////////////////////////////////////////////
// Using the business name to search for businesses will leead to incomplete results
// better to search using categorisa/alias and title associated with the business name
// For example one of the famous places in chicago for HotDogs is Portillos
// However, it also offers Salad and burgers
// Here is an example of a busness review from Yelp for Pertilos
//               alias': 'portillos-hot-dogs-chicago-4',
//              'categories': [{'alias': 'hotdog', 'title': 'Hot Dogs'},
//                             {'alias': 'salad', 'title': 'Salad'},
//                             {'alias': 'burgers', 'title': 'Burgers'}],
//              'name': "Portillo's Hot Dogs",
//////////////////////////////////////////////////////////////////////////////////////


    let body = {
        size: 1000,
        from: 0,
        "query": {
          "bool" : {
            "must" : {
               "term" : { "categories.alias" : place }
            },


            "filter": {
                "term" : { "location.zip_code" : where  }
            },


            "must" : {
              "range" : {
                "rating" : { "gte" : 0 }
              }
            },

            "must" : {
              "range" : {
                "review_count" : { "gte" : 0 }
              }
            },

            "should" : [
              { "term" : { "is_closed" : "false" } }
            ],
          }
        }
    }


    results = await esClient.search({index: 'healthub_yelp_reviews', body: body});
    console.log("Elastic Search Result ",results)
    results.hits.hits.forEach((hit, index) => {
        var place = {
                "name": hit._source.name,
                "display_phone": hit._source.display_phone,
                "address1": hit._source.location.address1,
                "is_closed": hit._source.is_closed,
                "rating": hit._source.rating,
                "review_count": hit._source.review_count,
                "latitude": hit._source.coordinates.latitude,
                "longitude": hit._source.coordinates.longitude
        };

        places_found.push(place);
        

    }
    );
    console.log(places_found);


}



/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////

///////    Fetch Divvy Stations' Logs from ElasticSearch                     ////////   
///////    Based on the time-window selected                                 ////////
///////    Time-window : 1 Hour, 24 Hours, 7 Days                            ////////

/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////

app.use('/', router);

app.listen(4000, () => {

            for (var i=0;i<7;i++) {
              dailyTrips[i] = [];
            }

            console.log('Make sure you execute following command before you start the Angular client');

            console.log('');            
            console.log('--------------------------------------------------------');

            

            console.log('--------------------------------------------------------');
            console.log('');

            console.log('Express server running on port 4000')
});
