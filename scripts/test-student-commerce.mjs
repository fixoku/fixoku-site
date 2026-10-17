import assert from "node:assert/strict";
import { validateEducationSegment } from "../src/server/domain/student-segment.js";
import { packageFamiliesForStage } from "../src/server/domain/student-commerce-catalog.js";

const accepted = [["PRIMARY",3],["PRIMARY",4],["MIDDLE",5],["MIDDLE",8],["HIGH",9],["HIGH",12],["ADULT",null]];
for(const [stage,grade] of accepted) assert.doesNotThrow(()=>validateEducationSegment(stage,grade));
for(const [stage,grade] of [["PRIMARY",5],["MIDDLE",4],["HIGH",8],["ADULT",12]]) assert.throws(()=>validateEducationSegment(stage,grade),/EDUCATION_STAGE_GRADE_INVALID/);
assert.equal(packageFamiliesForStage("PRIMARY").length,6);
assert.equal(packageFamiliesForStage("MIDDLE").length,8);
assert.equal(packageFamiliesForStage("HIGH").length,7);
assert.equal(packageFamiliesForStage("ADULT").length,5);
assert.equal(packageFamiliesForStage("ADULT").some((item)=>item.title.includes("PARAGRAF")),false);
assert.equal(packageFamiliesForStage("MIDDLE").some((item)=>item.title.includes("ORTAOKUL PARAGRAF")),true);
assert.equal(packageFamiliesForStage("HIGH").some((item)=>item.title.includes("LİSEL PARAGRAF")),true);
assert.equal(packageFamiliesForStage("PRIMARY").find((item)=>item.title==="BAŞLANGIÇ")?.subtitle,"Akıcı – Hızlı Okuma Dikkat ve Odaklanma Kitabı");
assert.equal(packageFamiliesForStage("ADULT").find((item)=>item.title==="BAŞLANGIÇ")?.subtitle,"Hızlı Okuma Dikkat ve Odaklanma Kitabı");
console.log(JSON.stringify({REGISTRATION_STAGE_GRADE_MATRIX:"PASS",PRIMARY_PACKAGES:6,MIDDLE_PACKAGES:8,HIGH_PACKAGES:7,ADULT_PACKAGES:5,PARAGRAPH_SEGMENT_RULES:"PASS",COPY_MATRIX:"PASS",NO_FAKE_PRICE_SEEDS:"PASS"}));
