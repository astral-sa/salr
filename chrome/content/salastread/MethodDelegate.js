
function SALR_MethodDelegate(obj, met)
{
   if ( typeof(obj)!="object" ) {
      throw "Attempt to create MethodDelegate on a non-object.";
   }
   if ( typeof(obj[met])!="function" ) {
      throw "Attempt to create MethodDelegate on a non-existant function name ("+met+").";
   }
   return function() {
      return SALR_CallFunctionWithArgs(obj, met, 0, arguments);
   };
}

function SALR_CallFunctionWithArgs(obj, func, sa, a)
{
   var alen = a.length;
   if ( alen == sa ) {
      if ( typeof(obj)=="object" ) {
         return obj[func]();
      } else {
         return func();
      }
   } else if ( alen == sa+1 ) {
      if ( typeof(obj)=="object" ) {
         return obj[func](a[sa]);
      } else {
         return func(a[sa]);
      }
   } else if ( alen == sa+2 ) {
      if ( typeof(obj)=="object" ) {
         return obj[func](a[sa],a[sa+1]);
      } else {
         return func(a[sa],a[sa+1]);
      }
   } else if ( alen == sa+3 ) {
      if ( typeof(obj)=="object" ) {
         return obj[func](a[sa],a[sa+1],a[sa+2]);
      } else {
         return func(a[sa],a[sa+1],a[sa+2]);
      }
   } else if ( alen > sa+3 ) {
      var rval = null;
      var estr = "rval = ";
      if ( typeof(obj)=="object" ) {
         estr += "obj[func](a["+sa+"]";
      } else {
         estr += "func(a["+sa+"]";
      }
      for (var anum=sa+1; anum<alen; anum++) {
         estr += ",a["+anum+"]";
      }
      estr += ");";
      eval(estr);
      return rval;
   }
}
