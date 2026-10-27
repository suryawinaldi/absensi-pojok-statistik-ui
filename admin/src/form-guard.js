// Track unsaved operational forms in memory; never store client details locally.
export function createFormGuard(isAuthorized, confirmDiscard = () => window.confirm('Ada perubahan yang belum disimpan. Tinggalkan formulir dan buang perubahan?')) {
  const tracked = form => form && (form.matches('[data-online-form]') || ['agent-form','post-form','shift-form','extra-shift-form','weekly-form','settings-form','attendance-form','fine-payment-form'].includes(form.id));
  const forms = scope => [...scope.querySelectorAll('form')].filter(tracked);
  const clear = (scope=document) => forms(scope).forEach(f=>delete f.dataset.unsaved);
  const dirty = (scope=document) => isAuthorized() && forms(scope).some(f=>f.dataset.unsaved==='true');
  const discard = (scope=document) => {if(!dirty(scope))return true; if(!confirmDiscard())return false;clear(scope);return true;};
  for(const event of ['input','change']) document.addEventListener(event,e=>{
    const form=e.target.closest('form'); if(isAuthorized() && tracked(form)) form.dataset.unsaved='true';
  });
  window.addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue='';}});
  const discardOther = (scope, current) => {
    const others=forms(scope).filter(f=>f!==current&&f.dataset.unsaved==='true');
    if (!isAuthorized()||!others.length) return true;
    if(!confirmDiscard())return false;
    others.forEach(f=>delete f.dataset.unsaved);return true;
  };
  return {clear,dirty,discard,discardOther};
}
