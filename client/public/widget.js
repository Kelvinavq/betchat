(function () {
  if (window.BetChatWidget && window.BetChatWidget.__loaded) return;

  var script = document.currentScript;
  if (!script) {
    var scripts = document.getElementsByTagName('script');
    script = scripts[scripts.length - 1];
  }

  var scriptUrl = new URL(script && script.src ? script.src : window.location.href, window.location.href);
  var baseUrl = scriptUrl.origin;
  var label = (script && script.getAttribute('data-label')) || 'Chat';
  var color = (script && script.getAttribute('data-color')) || '#1e85ff';
  var position = ((script && script.getAttribute('data-position')) || 'right').toLowerCase();
  var zIndex = (script && script.getAttribute('data-z-index')) || '2147483000';
  var frameSrc = (script && script.getAttribute('data-url')) || (baseUrl + '/?widget=1');

  if (!/[?&]widget=/.test(frameSrc)) {
    frameSrc += frameSrc.indexOf('?') === -1 ? '?widget=1' : '&widget=1';
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function createWidget() {
    if (document.getElementById('betchat-widget-root')) return;

    var host = document.createElement('div');
    host.id = 'betchat-widget-root';
    document.body.appendChild(host);

    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var sideProp = position === 'left' ? 'left' : 'right';
    var oppositeProp = position === 'left' ? 'right' : 'left';

    var style = document.createElement('style');
    style.textContent =
      ':host{all:initial}' +
      '.bcw-button{position:fixed;bottom:20px;' + sideProp + ':20px;z-index:' + zIndex + ';height:58px;min-width:58px;padding:0 18px;border:0;border-radius:999px;background:' + color + ';color:#fff;box-shadow:0 16px 40px rgba(0,0,0,.28),0 6px 16px rgba(0,0,0,.18);font:600 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:inline-flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease;}' +
      '.bcw-button:hover{transform:translateY(-1px);filter:brightness(1.06);box-shadow:0 18px 46px rgba(0,0,0,.32),0 7px 18px rgba(0,0,0,.20)}' +
      '.bcw-button:active{transform:translateY(0) scale(.98)}' +
      '.bcw-button[hidden]{display:none!important}' +
      '.bcw-icon{width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}' +
      '.bcw-icon svg{display:block;width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '.bcw-label{max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.bcw-frame{position:fixed;bottom:20px;' + sideProp + ':20px;' + oppositeProp + ':auto;z-index:' + zIndex + ';width:min(390px,calc(100vw - 24px));height:min(680px,calc(100dvh - 24px));border:0;border-radius:24px;overflow:hidden;background:transparent;box-shadow:0 24px 70px rgba(0,0,0,.35);display:none;}' +
      '.bcw-frame.bcw-open{display:block}' +
      '.bcw-frame iframe{width:100%;height:100%;border:0;background:transparent;display:block}' +
      '@media(max-width:520px){.bcw-button{bottom:16px;' + sideProp + ':16px}.bcw-frame{inset:0;width:100vw;height:100dvh;border-radius:0;box-shadow:none}}';

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'bcw-button';
    button.setAttribute('aria-label', 'Abrir chat');

    var icon = document.createElement('span');
    icon.className = 'bcw-icon';
    icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>';

    var text = document.createElement('span');
    text.className = 'bcw-label';
    text.textContent = label;

    button.appendChild(icon);
    if (label) button.appendChild(text);

    var frameWrap = document.createElement('div');
    frameWrap.className = 'bcw-frame';
    frameWrap.setAttribute('aria-live', 'polite');

    var iframe = null;
    var isOpen = false;

    function ensureFrame() {
      if (iframe) return iframe;
      iframe = document.createElement('iframe');
      iframe.src = frameSrc;
      iframe.title = label ? label + ' chat' : 'Chat';
      iframe.allow = 'clipboard-write; fullscreen; microphone; camera; autoplay';
      iframe.setAttribute('allowtransparency', 'true');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      frameWrap.appendChild(iframe);
      return iframe;
    }

    function open() {
      ensureFrame();
      isOpen = true;
      frameWrap.classList.add('bcw-open');
      button.hidden = true;
    }

    function close() {
      isOpen = false;
      frameWrap.classList.remove('bcw-open');
      button.hidden = false;
    }

    button.addEventListener('click', open);
    window.addEventListener('message', function (event) {
      if (event.origin !== baseUrl) return;
      if (event.data && event.data.type === 'betchat:close') close();
    });
    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen) close();
    });

    root.appendChild(style);
    root.appendChild(button);
    root.appendChild(frameWrap);

    window.BetChatWidget = {
      __loaded: true,
      open: open,
      close: close,
      toggle: function () { isOpen ? close() : open(); },
    };
  }

  onReady(createWidget);
})();
