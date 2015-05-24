/*

  This is a temporary fix to prevent page DOMs from being cached
  for the back button in Firefox 1.5.  By including this script
  on a forum page, it hooks up an unload event, which prevents
  Firefox from cachine the page DOM.

*/

function SALR_UnloadHandler() {
   //alert("here i am - rock you like a hurricane");
}

window.onunload = SALR_UnloadHandler;

