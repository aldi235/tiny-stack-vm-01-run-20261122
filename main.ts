import{mkdirSync as M,readdirSync as R,readFileSync as F,writeFileSync as W}from"fs"
const T="!2b%'+,0        *******&***&*** ***             AEEA!           &)              %%\"%"
let V=(p,q,D=new Int32Array(256),C=[],Y=[],S="",s=0,c=0,i=0,x=0,t=0,n=p.length)=>{try{for(;;){if(t++==1e6)throw 10
if(x<0||x>=n)throw 9
let o=p[x],v=T.charCodeAt(o)-33
if(!(v>=0))throw 5
x+=1+(v>>4)
if(x>n)throw 9
if(s<(v>>2&3))throw 2
if(s-(v>>2&3)+(v&3)>256)throw 3
if(v==9){let b=D[s-1],a=D[s-2],A=a>>>0,B=b>>>0,k=b&31
if(o>18&&o<23&&!b)throw 4
s-=2;D[s++]=[a+b,a-b,Math.imul(a,b),a/b,a%b,A/B,A%B,0,a&b,a|b,a^b,0,a<<k,a>>k,a>>>k,0,a==b,a<b,A<B][o-16]}
else switch(o){
case 0:throw 0
case 1:case 2:D[s++]=o<2?(p[x-1]<<24)>>24:p[x-4]|p[x-3]<<8|p[x-2]<<16|p[x-1]<<24;break
case 3:s--;break
case 4:D[s++]=D[s-2];break
case 5:[D[s-1],D[s-2]]=[D[s-2],D[s-1]];break
case 6:D[s++]=D[s-3];break
case 7:[D[s-3],D[s-2],D[s-1]]=[D[s-2],D[s-1],D[s-3]];break
case 23:case 27:D[s-1]=o<25?-D[s-1]:~D[s-1];break
case 48:case 49:case 50:let g=(p[x-2]|p[x-1]<<8)<<16>>16;if(o==48||(o==49)==!D[--s])x+=g;break
case 51:if(c==64)throw 7;C[c++]=x;x=p[x-2]|p[x-1]<<8;break
case 52:if(!c)throw 8;x=C[--c];break
case 64:case 65:let a=D[s-1];if(a>>>0>255)throw 6;o<65?D[s-1]=Y[a]:(s-=2,Y[a]=D[s]);break
case 80:let z=D[s-1]+"";if(S.length+z.length>65536)throw 11;s--;S+=z;break
case 81:if(S.length>65535)throw 11;S+=String.fromCharCode(D[--s]);break
case 82:D[s++]=q[i++]??-1;break
case 83:throw D[--s]&255}}}catch(z){return[Buffer.from(S,"latin1"),z]}}
for(let d of R("/input")){let b="/input/"+d,[a,c]=V(F(b+"/program.bin"),F(b+"/input.bin")),g="/output/"+d;M(g);W(g+"/stdout.bin",a);W(g+"/exit.txt",c+"")}
