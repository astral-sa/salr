
var args;

function onLoad() {
   args = window.arguments[0];
   var curl = args["captchaUrl"];

   //document.getElementById("lblUrl").setAttribute("value", curl);
   //return;

   document.getElementById("captchaImage").style.height = "60px";
   document.getElementById("captchaImage").style.maxHeight = "60px";
   document.getElementById("captchaImage").contentWindow.loadImage(curl);
   return;

   var i = document.createElement("iframe","http://www.w3.org/1999/xhtml");
   i.id = "captchaImage";
   //i.src = "http://forums.somethingawful.com/captcha.php?5892342";
   i.src = "http://www.msn.com";
   document.getElementById("captchaImageContainer").appendChild(i);
   //i.setAttribute("id", "captchaImage");
   //i.setAttribute("src", curl);
   //document.getElementById("captchaImageContainer").appendChild(i);
   //document.getElementById("captchaImageContainer").innerHTML =
   // "<image id=\"captchaImage\" src=\""+curl+"\"/>";
/*
   document.getElementById("captchaImage").parentNode.replaceChild(
      i,
      document.getElementById("captchaImage"));
*/

   document.getElementById("lblUrl").setAttribute("value", curl);
}

function loadAnotherCaptcha() {
   var url = "http://forums.somethingawful.com/captcha.php?" + Math.random();
   document.getElementById("captchaImage").contentWindow.loadImage(url);
}

function cancelChange() {
   args["continue"] = false;
   window.close();
}

function confirmIdentity() {
   args["captchaText"] = document.getElementById("tbCaptchaText").value;
   args["continue"] = true;
   window.close();
}
