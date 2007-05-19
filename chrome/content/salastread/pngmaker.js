
function PNGMaker()
{
}

PNGMaker.prototype =
{
   PNGCRCTable: null,
   m_fileSignature: String.fromCharCode(137)+"PNG"+
                    String.fromCharCode(13)+
                    String.fromCharCode(10)+
                    String.fromCharCode(26)+
                    String.fromCharCode(10),

   // Returns a byte string of the binary representation of the number "value" in "x" bytes.
   _GetXByteInt: function(value, x)
   {
      value = Number(value);
      var result = "";
      for (var i=0; i<x; i++) {
         var tval = value & 0xff;
         var value = (value & 0xffffff00)/256;
         result = String.fromCharCode(tval) + result;
      }
      return result;
   },

   // Returns a 4 byte string of the binary representation of the 32-bit integer "value".
   _Get4ByteInt: function(value)
   {
      return this._GetXByteInt(value, 4);
   },

   // Returns a 2 byte string of the binary representation of the 16-bit integer "value".
   _Get2ByteInt: function(value)
   {
      return this._GetXByteInt(value, 2);
   },

   // Returns a hex string representing the passed 32-bit integer "val".
   _Hex32: function(val)
   {
      var n;
      var str1;
      var str2;

      n=val&0xFFFF;
      str1=n.toString(16).toUpperCase();
      while (str1.length<4)
      {
        str1="0"+str1;
      }
      n=(val>>>16)&0xFFFF;
      str2=n.toString(16).toUpperCase();
      while (str2.length<4)
      {
        str2="0"+str2;
      }
      return "0x"+str2+str1;
   },

   // Builds the CRC32 lookup table.
   _make_crc_table: function()
   {
      var c;
      var n;
      var k;

      this.PNGCRCTable = new Array(256);

      for (n=0; n<256; n++) {
         c = n;
         for (k=0; k<8; k++) {
            if (c & 1) {
               c = 0xedb88320 ^ ((c >> 1) & 0x7fffffff);
            } else {
               c = (c >> 1) & 0x7fffffff;
            }
         }
         this.PNGCRCTable[n] = c;
      }
   },
  
   // Calculate the CRC32 of the given data. 
   _GetCRC: function(data)
   {
      if ( this.PNGCRCTable==null ) {
         this._make_crc_table();
      }

      var crc = 0xFFFFFFFF;
      var k;

      for ( var i = 0; i < data.length; i++ ) {
         var ch = data.charCodeAt(i);
         crc = ( this.PNGCRCTable[(crc^ch)&0xFF]^((crc>>8)&0x00FFFFFF) );
      }

      return (~crc) & 0xffffffff;
   }, 

   _Swap2Bytes: function(invalue)
   {
      var high = (invalue & 0xff00) >> 8;
      var low = (invalue & 0xff);
      return (low << 8)+high;
   },

   // This function takes uncompressed data "data" and creates a deflate compliant (RFC 1951) 
   // set of data chunks; but the data is not actually compressed -- it's stored in a series
   // of 'non-compressed' deflate data chunks. This is 100% valid deflate, but offers no space benefit.
   _DeflateData: function(data)
   {
      var result = "";
      var MAXLEN = 65535;
      while (data.length > 0) {
         var tbdata = data;
         if ( tbdata.length > MAXLEN ) {
            data = tbdata.substring(MAXLEN);
            tbdata = tbdata.substring(0,MAXLEN);
            result += this._GetXByteInt(248, 1);  // 1111 1000
         } else {
            data = "";
            result += this._GetXByteInt(249, 1);  // 1111 1001
         }
         var dlen = ((tbdata.length) & 0xffff);
         dlen = this._Swap2Bytes(dlen);
         result += this._GetXByteInt( dlen, 2 );
         result += this._GetXByteInt( ~dlen, 2 );
         result += tbdata;
      }

      return result;
   },

   // Calculate the Adler32 checksum of the given string "buf".
   _Adler32Checksum: function(buf)
   {
      var adler = 1;
      var len = buf.length;

      var NMAX = 3854;
      var BASE = 65521;

      var s1 = adler & 0xffff;
      var s2 = (adler & 0xffff0000) / 65536;
      var k;
      var bpos = 0;

      while (len > 0) {
         k = len < NMAX ? len : NMAX;
         len -= k;
         while (k > 0) {
            s1 = (s1 + buf.charCodeAt(bpos)) & 0xffffffff;
            s2 = (s2 + s1) & 0xffffffff;
            bpos += 1;
            k -= 1;
         }
         s1 = s1 % BASE;
         s2 = s2 % BASE;
      }
      return ((s2 & 0x0000ffff)*65536)+s1;
   },

   // Given uncompressed data "data", this function packages the data into zlib stream format,
   // specifying deflate compression and calculates the Adler32 checksum of the data.
   _CreateZlibStream: function(data)
   {
      var Z_DEFLATED = 8;
      //var header = ( Z_DEFLATED + ((7)<<4) ) << 8;
      var header = ( Z_DEFLATED + ((0)<<4) ) << 8;
      header += 31 - (header % 31);

      var result = this._Get2ByteInt(header);
      result += this._DeflateData(data);
      result += this._Get4ByteInt(this._Adler32Checksum(data));
      return result;
   },

   // Creates a PNG file chunk of the given type "type", with the contents "data".
   // This function creates the length header and calculates the chunk's CRC as well.
   _MakeChunk: function(type, data)
   {
      if (type.length != 4)
         throw "Invalid PNG chunk type: "+type;

      var cdata = this._Get4ByteInt( data.length );
      cdata += type + data;
      cdata += this._Get4ByteInt(this._GetCRC( type+data ));
      return cdata;
   },

   // Create an IHDR chunk. (See section 4.1.1 of the PNG 1.0 spec)
   _CreateIHDRChunk: function(width, height, bitdepth, colortype, compressionmethod, filtermethod, interlacemethod)
   {
      var data = this._GetXByteInt(width, 4) +
                 this._GetXByteInt(height, 4) +
                 this._GetXByteInt(bitdepth, 1) +
                 this._GetXByteInt(colortype, 1) +
                 this._GetXByteInt(compressionmethod, 1) +
                 this._GetXByteInt(filtermethod, 1) +
                 this._GetXByteInt(interlacemethod, 1);
      return this._MakeChunk("IHDR", data);
   },

   // Create an IEND chunk. (See section 4.1.4 of the PNG 1.0 spec)
   _CreateIENDChunk: function()
   {
      return this._MakeChunk("IEND", "");
   },

   // Create an IDAT chunk, given uncompressed "data". (See section 2.3 of the PNG 1.0 spec)
   _CreateIDATChunk: function(data)
   {
      var result = "";
      var zstr = this._CreateZlibStream(data);
      result += this._MakeChunk("IDAT", zstr);
      return result;
   },

   // This function creates a string representing the contents of a PNG. The resulting
   // image is "height" pixels high, 1 pixel wide, and shows an even gradient from the
   // color specified by "red", "green", and "blue" at the top of the image, to
   // totally transparent at the bottom of the image.  The color values must be between
   // 0 and 255.
   CreatePNG: function(red, green, blue, height)
   {
      var result = this.m_fileSignature;
      result += this._CreateIHDRChunk(1, height, 8, 6, 0, 0, 0);

      var pixdata = this._GetXByteInt(red, 1) +
                    this._GetXByteInt(green, 1) +
                    this._GetXByteInt(blue, 1);
      var idata = "";
      for (var lnum=0; lnum<height; lnum++) {
         idata += String.fromCharCode(0); // Filter type
         var trans = ( (height)-lnum ) / (height);
         idata += pixdata;
         idata += this._GetXByteInt( Math.floor(trans*255), 1 );
      }
      result += this._CreateIDATChunk(idata);

      result += this._CreateIENDChunk();

      return result;
   }
};
