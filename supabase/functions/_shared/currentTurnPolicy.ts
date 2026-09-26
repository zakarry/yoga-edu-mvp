/** Current-message grammar only. A symptom mention is not a symptom assertion.
 * Shared by browser routing and the server gate; never trusts a client safety flag.
 */
export type CurrentTurnSafety = 'none' | 'current_symptom' | 'red_flag' | 'personal_medical';
export function assessCurrentTurn(message: string) {
  const text = message.normalize('NFKC').replace(/いたい/g, '痛い').replace(/いたみ/g, '痛み').replace(/いたむ/g, '痛む').replace(/痺れ/g, 'しびれ');
  const health = /痛|しびれ|めまい|息苦し|怪我|けが|妊娠|手術|病気|持病|血圧|喘息|糖尿病|ヘルニア|関節炎|服薬/;
  const prevention = /予防|防ぐ|防ぎ|prevent/i.test(text);
  const informational = /について|とは|意味|仕組み|一般|原因|知りたい|教えて|説明|what is|tell me about/i.test(text);
  // Remove explicitly negated symptoms, not the entire sentence: "腰は痛くないが胸が痛い" must still block.
  const asserted = text.replace(/痛く(?:は)?ない|痛み(?:は|が|も)?(?:ありません|ない)|しびれ(?:は|が|も)?(?:ありません|ない)|めまい(?:は|が|も)?(?:ありません|ない)|息苦しくない/g, '');
  const clauses = asserted.split(/[。！？!?\n]|(?:けれど|けど|ですが|だが)/);
  let safety: CurrentTurnSafety = 'none';
  for (const clause of clauses) {
    const mentionsHealth = health.test(clause);
    if (!mentionsHealth) continue;
    // Hypothetical/quoted/general subjects are not reports of the speaker's present condition.
    const hypothetical = /(?:場合|とき|時|人|方|という言葉|という単語|という表現)/.test(clause);
    const current = /今(?:[、,はも]|$)|現在|さっきから|続いて|続く|感じ(?:る|ます|て)|(?:私|自分)(?:は|の|が)/.test(clause);
    const predicate = /痛い|痛む|(?:痛み|しびれ|めまい)(?:が|は|も)?(?:ある|あります|する|します|出て|続)|息苦しい|怪我をした|けがをした/.test(clause);
    const nounReport = mentionsHealth && !informational && !prevention;
    if ((predicate && (!hypothetical || current)) || (current && /(?:痛|しびれ|めまい).{0,6}(?:です|ある|あります|続)/.test(clause)) || nounReport) {
      if (/(?:胸|胸部).{0,10}(?:痛い|痛む|痛み)|胸痛|息苦しい|激痛|強い痛み|麻痺|感覚がない|動けない|歩けない|立てない/.test(clause)) {
        safety = 'red_flag'; break;
      }
      safety = 'current_symptom';
    }
  }
  if (safety === 'none' && health.test(asserted) && /(?:私|自分|個別).*(?:効く|合う|安全|処方)|(?:治す|治したい|治療して|薬を)/.test(text)) safety = 'personal_medical';
  return { safety, intent: safety !== 'none' ? 'safety' : health.test(text) && prevention ? 'prevention' : informational ? 'general_information' : 'conversation' };
}

export function safetyMessage(safety: CurrentTurnSafety): string {
  return safety === 'red_flag'
    ? '胸の痛みや息苦しさなど、緊急の対応が必要な可能性のある症状には、ヨガや呼吸法の提案は行いません。実践を中止し、すぐに医療機関や救急へ相談してください。'
    : '今の痛みや身体の状態について、個別の判断やポーズの処方はできません。今日は実践を中止し、医療専門家に相談してください。';
}
