import { quickReadingArticles, quickReadingHub } from "../../data/quickReadingContent.js";
import TopicHub from "./TopicHub.jsx";

export default function QuickReadingHub() {
  return <TopicHub articles={quickReadingArticles} hub={quickReadingHub} />;
}
