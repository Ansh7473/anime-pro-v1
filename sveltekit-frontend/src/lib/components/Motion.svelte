<script lang="ts">
  import { onMount } from "svelte";

  let {
    children,
    threshold = 0.1,
    rootMargin = "0px 0px -50px 0px",
    once = true,
    delay = 0,
  }: {
    children: any;
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
    delay?: number;
  } = $props();

  let visible = $state(false);
  let el: HTMLDivElement = $state(null!);

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          visible = true;
          if (once) observer.unobserve(el);
        } else if (!once) {
          visible = false;
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  });
</script>

<div
  bind:this={el}
  class="motion-reveal"
  class:is-visible={visible}
  style="transition-delay: {delay}ms"
>
  {@render children()}
</div>
