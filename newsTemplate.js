var createNewsList = function (newsElements) {
  var payload=JSON.stringify({'id' : 'MORE_NEWS_PAYLOAD'});
  var newsTemplate={
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "list",
        "elements": newsElements,
        "buttons": [
          {
            "title": "More",
            "type": "postback",
            "payload": payload,
          }
        ]
      }
    }
  };
  return newsTemplate;
}

var createNewsElement =function (element,domain)  {
  var payload=JSON.stringify({'id' : 'LIKE_PAYLOAD', 'domain' : domain , 'url' : element.url });
  var newsElement={
    "title": element.title,
    "image_url": element.urlToImage,
    "subtitle": "published on "+element.publishedAt,
    "default_action": {
      "type": "web_url",
      "url": element.url,

    },
    "buttons": [
      {
        "title": "Like",
        "type": "postback",
        "payload": payload,
      }
    ]
  };
  return newsElement;
}

var createTopElement = function(){
  var topElement={
    "title" : "Google News",
    "image_url" : "https://pctechmag.com/wp-content/uploads/2014/08/Google-news.png",
    "subtitle" : "based on your interests",
    "default_action": {
      "type": "web_url",
      "url": "https://pctechmag.com/wp-content/uploads/2014/08/Google-news.png",

    }
  };
  return topElement;
}

module.exports= {
  createNewsElement : createNewsElement,
  createNewsList : createNewsList,
  createTopElement : createTopElement,
}
