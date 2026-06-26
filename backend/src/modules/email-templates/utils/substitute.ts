export function substituteVariables(template: string, vars: Record<string, any>) {
  if (!template) return template;
  return template.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_, key) => {
    const parts = key.split('.');
    let val: any = vars;
    for (const p of parts) {
      if (val == null) return '';
      val = val[p];
    }
    if (val == null) return '';
    return String(val);
  });
}
