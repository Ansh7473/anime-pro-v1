<script lang="ts">
  let { data } = $props<{ data: Record<string, any> | Record<string, any>[] }>();

  const json = $derived(JSON.stringify(data).replace(/</g, "\\u003c"));
</script>

{@html `<script type="application/ld+json">${json}</script>`}
