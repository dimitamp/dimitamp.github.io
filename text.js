  const sentimentNegativeAnswer=["I'm sorry to hear that.","Someone is moody today! ","Don't let the silly little thing steal your Hapinness"];
  const sentimentPositiveAnswer=["That's great to hear.","I'm happy for you","Someone is positive today ^_^"];
  const greetings=["Hello ","Hi  ","Hey","Hey there","Well look who's here :)"];
  const moodQuestion=["How are you feeling today?","How are you doing today?","What's up?","How are you?"];
  const thanksAnswer=["My pleasure :) ","Don't mention it ^.^ ","You're Welcome :) "];
  const goodbye=["Enjoy the rest of your day!","Goodbye","Have a good day","Bye. Take care","Farewell"];
  const confusion=["Sorry I don't understand.","Sorry i don't know that yet.","Sorry, but i don't know what you're talking about.Maybe future me will understand"];
  const questionReplies=[["sport","music","science","politics","general","technology","entertainment","nature","business","gaming"],
  ["never","rarely","sometimes","often","always"],
  ["four-four-two","espn","the-sport-bible"],
  ["fortune","business-insider","financial-times"],
  ["the-lad-bible","entertainment-weekly","mashable"],
  ["ign","polygon"],
  ["bbc-news","the-new-york-times","the-guardian-uk"],
  ["mtv-news","mtv-news-uk"],
  ["breitbart-news"],
  ["new-scientist"],
  ["national-geographic"],
  ["the-verge","the-next-web","techradar"],
  ["2","1","0.5"]];
  const questions=["What's your favourite domain of interest?",
  "How often do you read news articles online?",
  "Choose news source for sport","Choose source for business",
  "Choose source for entertainment","Choose source for gaming",
  "Choose source for general","Choose source for music",
  "Choose source for politics","Choose source for science",
  "Choose source for nature","Choose source for technology",
  "Choose your preferred history/news weight analogy"];
  const helpMessage="Let me introduce you to the basics.\n Send a greeting to start a conversation. \n You can ask for news about a specific domain. (e.g Fetch me news about sport, send me news about music, news about politics) If the domain is left blank the bot will send you news based on your interests \n The available domains at the moment are Entertainment, Muic, Sport, Politics, Gaming, General, Nature, Science, Business, Technology \n Send 'questionnaire' to fill in the questionnaire or change your answers \n If you liked an article click the 'like' button in order to provide better feedback for your profile. \n"
  const newsSources={"sport":"the-sport-bible" ,"business":"business-insider","entertainment":"the-lad-bible",
  "gaming":"ign","general":"bbc-news","music":"mtv-news","politics":"breitbart-news",
  "science":"new-scientist","nature":"national-geographic","technology":"the-verge"};
module.exports = {
  greetings :greetings,
  confusion : confusion,
  thanksAnswer:thanksAnswer,
  moodQuestion : moodQuestion,
  goodbye : goodbye,
  sentimentPositiveAnswer : sentimentPositiveAnswer,
  sentimentNegativeAnswer : sentimentNegativeAnswer,
  questionReplies : questionReplies,
  questions : questions,
  helpMessage : helpMessage,
  newsSources : newsSources,
};
