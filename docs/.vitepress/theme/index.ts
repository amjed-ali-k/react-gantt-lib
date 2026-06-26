import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import ReactDemo from './components/ReactDemo.vue';
import PlaygroundEmbed from './components/PlaygroundEmbed.vue';
import '@src/styles/gantt.css';
import '@demo/stickyRowsDemo.css';
import '@demo/largeTimelineDemo.css';
import './demos/demo-embed.css';
import './custom.css';
import './demo.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ReactDemo', ReactDemo);
    app.component('GanttDemo', ReactDemo);
    app.component('PlaygroundEmbed', PlaygroundEmbed);
  },
} satisfies Theme;
