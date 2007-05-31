// <script>
function selectNodes(doc, context, xpath) {
   var nodes = doc.evaluate(xpath, context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
   //var item;
   var result = new Array( nodes.snapshotLength );
   for (var x=0; x<result.length; x++) {
      result[x] = nodes.snapshotItem(x);
   }
   //while ( item = nodes.iterateNext() ) {
   //   result.push(item);
   //}
   return result;
}

function selectSingleNode(doc, context, xpath) {
   var nodeList = doc.evaluate(xpath, context, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
   return nodeList.singleNodeValue;
}

