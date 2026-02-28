# Emoji Mirror

The emoji displayed on the screen will change constantly to mirror your facial expressions.

### Facial Expression Detection

The software detects expressions from your face using the library <b>face-api.js</b>. It uses three models to do this: <b>tinyFaceDetector</b> detects where your face is in the video stream, <b>faceLandmark68Net</b> maps out 68 specific points on your face (node, eyes, mouth, etc), and <b>faceExpressionNet</b> guesses the expression given by your face.

There are five main expressions that this program translates into emojis: happy, sad, surprised, angry, and confused. Each of these emotions is mapped to a list of emojis that the screen cycles through. The first four emotions are detected by the face-api model. Whatever emotion has the highest percentage of confidence from the model is the current emotion.

However, the model doesn't output a detection for the confused emotion. The way the confused emotion is detected is through checking the height difference of one eyebrow vs the other. If the difference is large enough, the screen will show the thinking emoji.

If the program doesn't detect any of these five emotions, it displays the neutral face emoji. One challenge when developing this was that it often defaulted to the neutral emoji even when I was clearly smiling or frowning. To improve this, I made it so that if the model detects just a 20% chance of being happy or sad, it overrides this neutral reading. 

### Inspiration

This project was made for DESINV 23 at UC Berkeley. I was inspired by all the projects we were shown that made use of a camera pointed at your face in order to mirror a different version of that image back to you. I thought of different ways to render a person, such as cartoon characters or stick figures, but I eventually settled on emojis. I like the idea of using emojis because not only are they funny, but they are also more abstract and representative rather than being an attempt to render the exact video image in a certain style.