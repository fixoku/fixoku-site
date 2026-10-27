import { attentionFocusContentByPath } from "./attentionFocusContent.js";
import { blogContentByPath } from "./blogContent.js";
import { corporateContentByPath } from "./corporateContent.js";
import { fixokuEducationContentByPath } from "./fixokuEducationContent.js";
import { knowledgeCenterContentByPath } from "./knowledgeCenterContent.js";
import { quickReadingContentByPath } from "./quickReadingContent.js";
import { trainingContentByPath } from "./trainingContent.js";

export const contentCatalogByPath = {
  ...quickReadingContentByPath,
  ...attentionFocusContentByPath,
  ...fixokuEducationContentByPath,
  ...knowledgeCenterContentByPath,
  ...blogContentByPath,
  ...trainingContentByPath,
  ...corporateContentByPath,
};
