import Script from "next/script";
import React from "react";

const HeadScripts = () => {
  return (
    <>
      <Script id="vq-it" strategy="beforeInteractive">
        {`function vqIt(){return 'fe';}`}
      </Script>
      <link
        rel="dns-prefetch"
        href="//t.visitorqueue.com"
        style={{ display: "none !important" }}
      />
      <Script id="vq-track-id" strategy="beforeInteractive">
        {`function vqTrackId(){return '74a8b917-6eea-4034-90c8-8188ef95eb64';}
      (function(d, e) {
        var el = d.createElement(e);
        el.sa = function(an, av){this.setAttribute(an, av); return this;};
        el.sa('id', 'vq_tracking')
          .sa('src', '//t.visitorqueue.com/p/tracking.min.js?id=' + vqTrackId())
          .sa('async', 1)
          .sa('data-id', vqTrackId());
        d.getElementsByTagName(e)[0].parentNode.appendChild(el);
      })(document, 'script');`}
      </Script>
      <link
        rel="stylesheet"
        type="text/css"
        href="https://p.visitorqueue.com/styles/74a8b917-6eea-4034-90c8-8188ef95eb64.css"
        id="vq_flick_styles"
      />
      <Script id="vq-track-pc" strategy="beforeInteractive">
        {`function vqTrackPc(){return 1;}`}
      </Script>
      <Script id="vq-personalisation" strategy="beforeInteractive">
        {`(function(d, e) {
        var el = d.createElement(e);
        el.sa = function(an, av){this.setAttribute(an, av); return this;};
        el.sa('id', 'vq_personalisation')
          .sa('src', '//personalisation.visitorqueue.com/p/personalisation.min.js?id=' + vqTrackId())
          .sa('async', 1)
          .sa('data-id', vqTrackId());
        d.getElementsByTagName(e)[0].parentNode.appendChild(el);
      })(document, 'script');`}
      </Script>

      {/* LeadRebel */}
      <Script id="leadrebel" strategy="beforeInteractive">
        {`(function(d, w, b, t){
              var h = d.getElementsByTagName("head")[0];
              var s = d.createElement("script");
              s.src = b + "/t/script.js?c=" + t;
              h.appendChild(s);
            })(document, window, "https://ltracking.de", "678e91e658927a9e36169550");`}
      </Script>

      {/* FactorsAI */}
      <Script id="factorsai" strategy="beforeInteractive">
        {`window.faitracker=window.faitracker||function(){this.q=[];var t=new CustomEvent("FAITRACKER_QUEUED_EVENT");return this.init=function(t,e,a){this.TOKEN=t,this.INIT_PARAMS=e,this.INIT_CALLBACK=a,window.dispatchEvent(new CustomEvent("FAITRACKER_INIT_EVENT"))},this.call=function(){var e={k:"",a:[]};if(arguments&&arguments.length>=1){for(var a=1;a<arguments.length;a++)e.a.push(arguments[a]);e.k=arguments[0]}this.q.push(e),window.dispatchEvent(t)},this.message=function(){window.addEventListener("message",function(t){"faitracker"===t.data.origin&&this.call("message",t.data.type,t.data.message)})},this.message(),this.init("8ssnvgtatr7t0ogvfv18e5jc1gdiopj0",{host:"https://api.factors.ai"}),this}(),function(){var t=document.createElement("script");t.type="text/javascript",t.src="https://app.factors.ai/assets/factors.js",t.async=!0,(d=document.getElementsByTagName("script")[0]).parentNode.insertBefore(t,d)}();`}
      </Script>

      {/* HubSpot */}
      <Script
        id="hubspot"
        src="//js.hs-scripts.com/49008432.js"
        strategy="afterInteractive"
      />

      {/* Customers.ai */}
      <Script
        id="customersai"
        src="https://mm-uxrv.com/js/mm_01379b69-77ac-4756-bdcd-9e9593bad417-14145137.js"
        strategy="afterInteractive"
      />

      {/* Leady.com */}
      <Script id="leady" strategy="beforeInteractive">
        {`!function(g,t){g.type="text/javascript";g.async=true;g.src="https://ct.leady.com/3Sn2MJ8kh0E1HqPZ/L.js";t=t[0];t.parentNode.insertBefore(g,t);}(document.createElement("script"),document.getElementsByTagName("script"));`}
      </Script>
    </>
  );
};

export default HeadScripts;

export const BodyScripts = () => {
  return (
    <>
      {" "}
      {/* Warmly Script Loader */}
      <Script
        id="warmly-script-loader"
        src="https://opps-widget.getwarmly.com/warmly.js?clientId=86babbef40c5d6164dcf5948140d010d"
        strategy="afterInteractive"
        defer
      />
      {/* Reb2b */}
      <Script id="reb2b" strategy="afterInteractive">
        {`!function () {
        var reb2b = window.reb2b = window.reb2b || [];
        if (reb2b.invoked) return;
        reb2b.invoked = true;
        reb2b.methods = ["identify", "collect"];
        reb2b.factory = function (method) {
          return function () {
            var args = Array.prototype.slice.call(arguments);
            args.unshift(method);
            reb2b.push(args);
            return reb2b;
          };
        };
        for (var i = 0; i < reb2b.methods.length; i++) {
          var key = reb2b.methods[i];
          reb2b[key] = reb2b.factory(key);
        }
        reb2b.load = function (key) {
          var script = document.createElement("script");
          script.type = "text/javascript";
          script.async = true;
          script.src = "https://s3-us-west-2.amazonaws.com/b2bjsstore/b/" + key + "/1N5W0H0Q19O5.js.gz";
          var first = document.getElementsByTagName("script")[0];
          first.parentNode.insertBefore(script, first);
        };
        reb2b.SNIPPET_VERSION = "1.0.1";
        reb2b.load("1N5W0H0Q19O5");
      }();`}
      </Script>
      {/* LeadFeeder */}
      <Script id="leadfeeder" strategy="afterInteractive">
        {`(function(ss, ex) {
        window.ldfdr = window.ldfdr || function() {
          (ldfdr.q = ldfdr._q || []).push([].slice.call(arguments));
        };
        (function(d, s) {
          var fs = d.getElementsByTagName(s)[0];
          function ce(src) {
            var cs = d.createElement(s);
            cs.src = src;
            cs.async = 1;
            fs.parentNode.insertBefore(cs, fs);
          }
          ce('https://sc.lfeeder.com/lftracker_v1' + ss + (ex ? '_' + ex : '') + '.js');
        })(document, 'script');
      })('YEgkB8l5ObM7ep3Z');`}
      </Script>
      {/* LeadsY */}
      <Script
        id="leadsy"
        src="https://r2.leadsy.ai/tag.js"
        data-pid="NpGE8Ey0ZnOKRJDJ"
        data-version="062024"
        strategy="afterInteractive"
        async
      />
      {/* Common Room */}
      <Script id="common-room" strategy="afterInteractive">
        {`(function() {
        if (typeof window === 'undefined') return;
        if (typeof window.signals !== 'undefined') return;
        var script = document.createElement('script');
        script.src = 'https://cdn.cr-relay.com/v1/site/192bfe39-972a-40eb-b13f-a95e1f2a9100/signals.js';
        script.async = true;
        window.signals = Object.assign(
          [],
          ['page', 'identify', 'form'].reduce(function (acc, method) {
            acc[method] = function () {
              signals.push([method, arguments]);
              return signals;
            };
            return acc;
          }, {})
        );
        document.head.appendChild(script);
      })();`}
      </Script>
      {/* Koala */}
      <Script id="koala" strategy="afterInteractive">
        {`!function(t) {
        var k = "ko", i = (window.globalKoalaKey = window.globalKoalaKey || k);
        if (window[i]) return;
        var ko = (window[i] = []);
        ["identify", "track", "removeListeners", "on", "off", "qualify", "ready"].forEach(function(t) {
          ko[t] = function() {
            var n = [].slice.call(arguments);
            n.unshift(t);
            ko.push(n);
          }
        });
        var n = document.createElement("script");
        n.async = !0;
        n.setAttribute("src", "https://cdn.getkoala.com/v1/pk_19890b57262c93bb030d8684d4f0bf2e7cc2/sdk.js");
        (document.body || document.head).appendChild(n);
      }();
    `}
      </Script>
      {/* CustomerLabs Tag */}
      <Script id="customerlabs" strategy="afterInteractive">
        {`!function(t,e,r,c,a,n,s){
              t.ClAnalyticsObject=a;
              t[a]=t[a]||[];
              t[a].methods=["trackSubmit","trackClick","pageview","identify","track","trackConsent"];
              t[a].factory=function(e){
                return function(){
                  var r=Array.prototype.slice.call(arguments);
                  r.unshift(e);
                  t[a].push(r);
                  return t[a];
                };
              };
              for(var i=0;i<t[a].methods.length;i++){
                var o=t[a].methods[i];
                t[a][o]=t[a].factory(o);
              }
              n=e.createElement(r);
              s=e.getElementsByTagName(r)[0];
              n.async=1;
              n.crossOrigin="anonymous";
              n.src=c;
              s.parentNode.insertBefore(n,s);
            }(window,document,"script","https://cdn.js.customerlabs.co/cl6399vjazrq22.js","_cl");
            _cl.SNIPPET_VERSION="2.0.0";`}
      </Script>
      {/* Albacross */}
      <Script id="albacross" strategy="afterInteractive">
        {`window._nQc="89855406";`}
      </Script>
      <Script
        src="https://serve.albacross.com/track.js"
        strategy="afterInteractive"
        async
      />
    </>
  );
};