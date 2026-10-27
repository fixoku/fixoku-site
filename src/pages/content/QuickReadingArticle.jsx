import { contentCatalogByPath } from "../../data/contentCatalog.js";
import TopicArticle from "./TopicArticle.jsx";

export default function QuickReadingArticle({ article }) {
  return <TopicArticle article={article} contentByPath={contentCatalogByPath} />;
}
