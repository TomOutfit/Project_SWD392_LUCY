import fs from 'fs';
import path from 'path';
import { ContentPin, Language } from '../types/index.js';

interface AiRecommendation {
  vocabulary: string[];
  grammarTips: string[];
  conversationPrompts: string[];
  aiSuggestedQuestions: string[];
}

async function getPinTextContext(pin: ContentPin): Promise<string> {
  let context = `Document Title: ${pin.title}\nDocument Type: ${pin.type}\n`;
  if (pin.url && !pin.url.startsWith('http') && pin.url.startsWith('/uploads/')) {
    try {
      const filePath = path.join(process.cwd(), pin.url);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size < 1024 * 1024) { // Only read files under 1MB
          const ext = path.extname(filePath).toLowerCase();
          if (['.txt', '.md', '.json', '.html', '.csv'].includes(ext)) {
            const content = fs.readFileSync(filePath, 'utf8');
            context += `Document Content Snippet:\n${content.slice(0, 3000)}`;
          }
        }
      }
    } catch (e) {
      console.error('[aiService] Failed to read local pinned file:', e);
    }
  } else if (pin.url && !pin.url.startsWith('/uploads/')) {
    context += `Document Description/Content: ${pin.url}\n`;
  }
  return context;
}

export async function generateRecommendationsFromPin(pin: ContentPin, language: Language): Promise<AiRecommendation> {
  const context = await getPinTextContext(pin);
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    try {
      const prompt = `
You are an expert language teacher AI assistant for the platform LUCY (Language Unity & Collaborative Youth).
The current classroom speaking room language is: ${language === 'EN' ? 'English' : language === 'ZH' ? 'Chinese/Mandarin' : 'Japanese'}.
The host of the classroom has pinned a learning document.

Here is the document context:
${context}

Based on this pinned document, generate custom learning recommendations for the students.
Ensure the suggestions directly match the content, theme, and vocabulary of this pinned document.

Please return a JSON object with the exact keys:
1. "vocabulary": array of 4-6 key vocabulary words or phrases from or related to the document (include their meanings/pronunciation in Vietnamese).
2. "grammarTips": array of 2-3 grammar points or key structures related to the document topic (explained in Vietnamese).
3. "conversationPrompts": array of 3-4 speaking activities, role-plays, or discussion topics in target language (explained in Vietnamese).
4. "aiSuggestedQuestions": array of 3-4 specific speaking questions in target language that the learners can answer to practice (explained/translated in Vietnamese).

Respond ONLY with a valid JSON block, no markdown formatting or backticks outside the JSON.
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.vocabulary && parsed.grammarTips && parsed.conversationPrompts && parsed.aiSuggestedQuestions) {
            console.log('[aiService] Successfully generated recommendations using Gemini API');
            return parsed as AiRecommendation;
          }
        }
      } else {
        console.error('[aiService] Gemini API response error:', response.status, await response.text());
      }
    } catch (err) {
      console.error('[aiService] Failed to generate via Gemini, falling back to smart local rules:', err);
    }
  }

  // Fallback: Smart local rule-based recommendations based on keywords in title & content
  return generateFallbackRecommendations(pin, language);
}

function generateFallbackRecommendations(pin: ContentPin, language: Language): AiRecommendation {
  const title = (pin.title + ' ' + pin.url).toLowerCase();
  
  // Detect theme
  let theme: 'travel' | 'business' | 'food' | 'shopping' | 'daily' | 'general' = 'general';
  
  if (/travel|tour|trip|hotel|airport|flight|destination|visit|map|japan|tokyo|china|beijing|america|london/i.test(title)) {
    theme = 'travel';
  } else if (/job|work|interview|business|career|office|resume|cv|meeting|presentation|negotiate|company/i.test(title)) {
    theme = 'business';
  } else if (/food|eat|restaurant|menu|drink|cooking|cuisine|chef|dinner|lunch|breakfast|coffee/i.test(title)) {
    theme = 'food';
  } else if (/shop|buy|store|price|mall|clothes|order|purchase|sale|discount/i.test(title)) {
    theme = 'shopping';
  } else if (/daily|routine|hobby|sport|music|movie|book|friend|family|lifestyle|hobby|weather/i.test(title)) {
    theme = 'daily';
  }

  const database: Record<Language, Record<string, AiRecommendation>> = {
    EN: {
      travel: {
        vocabulary: [
          'Itinerary (n): Lịch trình chuyến đi',
          'Layover (n): Điểm dừng chân chuyển tiếp bay',
          'To book in advance: Đặt trước (phòng, vé...)',
          'Breathtaking scenery: Phong cảnh đẹp ngoạn mục',
          'Local delicacy (n): Đặc sản địa phương'
        ],
        grammarTips: [
          'Sử dụng "Would you mind + V-ing..." để nhờ vả lịch sự khi đi du lịch (Ví dụ: Would you mind taking a photo for me?)',
          'Sử dụng "I would like to + Verb..." để đặt dịch vụ (Ví dụ: I would like to book a double room.)'
        ],
        conversationPrompts: [
          'Role-play: Một bạn làm nhân viên khách sạn, một bạn là khách hàng phàn nàn về phòng ồn.',
          'Talk about your dream holiday destination and why you want to visit it.',
          'Discussion: Du lịch bụi (Backpacking) vs Du lịch nghỉ dưỡng (Resort holiday) — Bạn chọn cái nào?'
        ],
        aiSuggestedQuestions: [
          'What is the most beautiful place you have ever traveled to?',
          'If you could travel anywhere right now, where would you go?',
          'Do you prefer traveling alone or with a group? Why?'
        ]
      },
      business: {
        vocabulary: [
          'Onboard (v): Tiếp nhận nhân sự mới',
          'KPI (Key Performance Indicator): Chỉ số đánh giá hiệu quả công việc',
          'To collaborate (v): Hợp tác, làm việc chung',
          'Deadline (n): Hạn chót công việc',
          'Synergy (n): Sự cộng hưởng hiệu quả'
        ],
        grammarTips: [
          'Sử dụng Present Perfect (Thì hiện tại hoàn thành) để mô tả kinh nghiệm trong CV (Ví dụ: I have managed several projects...)',
          'Sử dụng Conditional Sentences (Câu điều kiện) để đàm phán (Ví dụ: If you offer a discount, we will sign the contract.)'
        ],
        conversationPrompts: [
          'Role-play: Phỏng vấn xin việc vị trí Marketing Manager.',
          'Discuss the pros and cons of Remote Working (WFH) versus working in the office.',
          'Pitch a new startup idea to investors in 2 minutes.'
        ],
        aiSuggestedQuestions: [
          'What are your short-term and long-term career goals?',
          'How do you manage stress and tight deadlines at work?',
          'Can you describe a challenging project you successfully completed?'
        ]
      },
      food: {
        vocabulary: [
          'Appetizer (n): Món khai vị',
          'Savory (adj): Có vị mặn/đậm đà (không ngọt)',
          'To grab a bite: Đi ăn nhanh cái gì đó',
          'Dietary restriction (n): Chế độ ăn kiêng đặc biệt',
          'Complimentary (adj): Được tặng kèm/miễn phí'
        ],
        grammarTips: [
          'Phân biệt danh từ đếm được và không đếm được trong gọi món (Ví dụ: a glass of water vs some bread)',
          'Cách dùng "Could I have..." để gọi món một cách lịch sự'
        ],
        conversationPrompts: [
          'Role-play: Gọi món tại một nhà hàng sang trọng và yêu cầu đổi món do dị ứng.',
          'Introduce your favorite Vietnamese dish to a foreign friend.',
          'Discussion: Ăn uống lành mạnh (Healthy eating) có đắt đỏ không?'
        ],
        aiSuggestedQuestions: [
          'What is your absolute favorite food, and how often do you eat it?',
          'Do you prefer dining out at restaurants or cooking at home?',
          'If you were to open a restaurant, what kind of food would you serve?'
        ]
      },
      shopping: {
        vocabulary: [
          'Bargain (n/v): Món hời / Mặc cả',
          'Receipt (n): Hóa đơn thanh toán',
          'Refund (n/v): Tiền hoàn lại / Hoàn tiền',
          'Window shopping: Đi ngắm đồ chứ không mua',
          'Out of stock: Hết hàng'
        ],
        grammarTips: [
          'Sử dụng mệnh đề so sánh để cân nhắc lựa chọn (Ví dụ: This jacket is much warmer than that one.)',
          'Cách dùng động từ khuyết thiếu để hỏi size và màu sắc: "Do you have this in...?"'
        ],
        conversationPrompts: [
          'Role-play: Mặc cả giá tại một chợ địa phương.',
          'Discuss online shopping vs brick-and-mortar stores. Which do you prefer?',
          'Describe the last clothing item you bought and why you bought it.'
        ],
        aiSuggestedQuestions: [
          'How often do you go shopping, and what do you buy most?',
          'Do you think online shopping will completely replace traditional stores?',
          'What was the best bargain purchase you have ever made?'
        ]
      },
      daily: {
        vocabulary: [
          'Night owl (n): Kẻ cú đêm',
          'Chill out (v): Thư giãn, xả hơi',
          'To pick up a hobby: Bắt đầu một sở thích mới',
          'Catch up (v): Hàn huyên, cập nhật tình hình',
          'Productive (adj): Làm việc năng suất, hiệu quả'
        ],
        grammarTips: [
          'Sử dụng Adverbs of Frequency (trạng từ chỉ tần suất) để tả thời gian biểu (Ví dụ: I rarely sleep before midnight.)',
          'Sử dụng "used to + Verb" để kể về sở thích cũ nay không còn làm nữa'
        ],
        conversationPrompts: [
          'Describe a typical day in your life from morning to night.',
          'Share a hobby you love and explain why you find it interesting.',
          'Discussion: Làm sao để cân bằng giữa công việc và cuộc sống cá nhân?'
        ],
        aiSuggestedQuestions: [
          'What is your favorite part of the day and why?',
          'What are some hobbies you want to try in the future?',
          'How do you usually spend your weekends to recharge?'
        ]
      },
      general: {
        vocabulary: [
          'Express (v): Bày tỏ, diễn đạt',
          'Fluency (n): Sự trôi chảy, lưu loát',
          'Interact (v): Tương tác qua lại',
          'Perspective (n): Góc nhìn, quan điểm',
          'Immersive (adj): Mang tính chìm đắm, thực tế'
        ],
        grammarTips: [
          'Sử dụng các từ nối ý (Linking words) như "However", "In addition", "Consequently" để lập luận mạch lạc',
          'Sử dụng "In my opinion / From my perspective..." để mở đầu ý kiến cá nhân'
        ],
        conversationPrompts: [
          'Discuss the best way to master a new foreign language.',
          'Debate: Trí tuệ nhân tạo (AI) sẽ thay thế giáo viên ngôn ngữ?',
          'Share your experience learning with LUCY platform.'
        ],
        aiSuggestedQuestions: [
          'What has been the biggest challenge for you in learning English?',
          'Why do you think speaking practice is so important for language acquisition?',
          'What are some of your favorite study tips or apps?'
        ]
      }
    },
    ZH: {
      travel: {
        vocabulary: [
          '行程 (xíngchéng): Lịch trình',
          '预订 (yùdìng): Đặt trước',
          '风景如画 (fēngjǐngrúhuà): Phong cảnh đẹp như tranh vẽ',
          '风味小吃 (fēngwèixiǎochī): Món ăn vặt đặc sản',
          '导游 (dǎoyóu): Hướng dẫn viên du lịch'
        ],
        grammarTips: [
          'Cấu trúc "从...到..." (Từ... đến...) để nói về lộ trình di chuyển (Ví dụ: 从河内到北京...)',
          'Sử dụng "打算" (dǎsuàn) để diễn tả dự định đi du lịch (Ví dụ: 我打算去中国旅游。)'
        ],
        conversationPrompts: [
          'Đóng vai: Bạn đang ở sân bay Bắc Kinh hỏi đường về khách sạn.',
          'Giới thiệu về một địa điểm du lịch ở Việt Nam bằng tiếng Trung.',
          'Thảo luận: Bạn thích đi du lịch tự túc hay đi tour hơn?'
        ],
        aiSuggestedQuestions: [
          '你最想去中国哪个城市旅游？为什么？',
          '旅游的时候，你最喜欢做什么？',
          '可以介绍一下你的家乡有什么好玩的地方吗？'
        ]
      },
      business: {
        vocabulary: [
          '简历 (jiǎnlì): Sơ yếu lý lịch, CV',
          '面试 (miànshì): Phỏng vấn',
          '合作 (hézuò): Hợp tác',
          '加班 (jiābān): Làm tăng ca',
          '效率 (xiàolǜ): Hiệu suất, hiệu quả'
        ],
        grammarTips: [
          'Sử dụng "除了...以外，还..." để liệt kê kỹ năng chuyên môn trong buổi phỏng vấn',
          'Cách dùng cấu trúc "对...感兴趣" (Quan tâm/thích thú với...) khi phỏng vấn xin việc'
        ],
        conversationPrompts: [
          'Đóng vai: Cuộc phỏng vấn tuyển dụng nhân viên kinh doanh tiếng Trung.',
          'Thảo luận về văn hóa làm việc OT (tăng ca) ở các công ty công nghệ.',
          'Thuyết trình ngắn 2 phút giới thiệu dự án của bạn.'
        ],
        aiSuggestedQuestions: [
          '你为什么申请我们公司这个职位？',
          '你觉得工作中沟通能力重要还是专业技能重要？',
          '你如何规划你未来五年的职业生涯？'
        ]
      },
      food: {
        vocabulary: [
          '招牌菜 (zhāopáicài): Món ăn đặc trưng/món tủ của quán',
          '尝尝 (chángchang): Nếm thử',
          '美味 (měiwèi): Ngon miệng, mỹ vị',
          '忌口 (jìkǒu): Ăn kiêng/không ăn được món gì',
          '买单 (mǎidān): Thanh toán tiền'
        ],
        grammarTips: [
          'Sử dụng từ lặp "A一A" để nhờ vả nhẹ nhàng (Ví dụ: 尝一尝 món ăn này thử đi)',
          'Sử dụng cấu trúc "...极了" để khen ngợi món ăn (Ví dụ: 这个烤鸭好吃极了！)'
        ],
        conversationPrompts: [
          'Đóng vai: Đặt bàn và gọi món tại một nhà hàng Tứ Xuyên.',
          'Giới thiệu món Phở hoặc Bánh mì bằng tiếng Trung.',
          'Thảo luận: Bạn thích đồ ăn tự nấu ở nhà hay đồ ăn ngoài tiệm hơn?'
        ],
        aiSuggestedQuestions: [
          '你最喜欢吃哪种中国菜？为什么？',
          '平时你是自己做饭还是点外卖？',
          '如果你的外国朋友来，你会带他们去吃什么越南特色美食？'
        ]
      },
      shopping: {
        vocabulary: [
          '打折 (dǎzhé): Giảm giá',
          '便宜 (piányi): Rẻ',
          '发票 (fāpiào): Hóa đơn đỏ',
          '退款 (tuìkuǎn): Hoàn tiền',
          '试穿 (shìchuān): Thử đồ'
        ],
        grammarTips: [
          'Cách dùng cấu trúc so sánh "A比B + Adj" khi cân nhắc chọn đồ',
          'Cách hỏi giá cả lịch sự: "这个怎么卖？" hoặc "可以打折吗？"'
        ],
        conversationPrompts: [
          'Đóng vai: Trả giá/mặc cả khi mua sắm tại chợ quần áo.',
          'Thảo luận: Mua sắm online có thực sự tiết kiệm thời gian và tiền bạc không?',
          'Miêu tả bộ quần áo bạn thích nhất mới mua gần đây.'
        ],
        aiSuggestedQuestions: [
          '你平时喜欢在网上买东西还是去实体店？',
          '你买过最贵的东西是什么？你觉得值吗？',
          '在越南买东西的时候你会和老板砍价吗？'
        ]
      },
      daily: {
        vocabulary: [
          '熬夜 (áoyè): Thức khuya',
          '放松 (fàngsōng): Thư giãn',
          '兴趣爱好 (xìngqù àihào): Sở thích',
          '聚会 (jùhuì): Tụ tập, gặp mặt',
          '充实 (chōngshí): Đầy đủ, phong phú'
        ],
        grammarTips: [
          'Dùng "一边...一边..." để diễn tả 2 hành động xảy ra cùng lúc (Ví dụ: 一边听音乐一边看书)',
          'Dùng "除了...都..." để nói về thói quen (Ví dụ: 除了周末，我每天都早起。)'
        ],
        conversationPrompts: [
          'Mô tả một ngày bình thường của bạn từ lúc thức dậy.',
          'Chia sẻ về sở thích kỳ lạ hoặc thú vị nhất của bạn.',
          'Thảo luận: Làm thế nào để giải tỏa áp lực học tập và cuộc sống?'
        ],
        aiSuggestedQuestions: [
          '你周末一般怎么过？',
          '你有什么坚持了很久的习惯？',
          '你喜欢安静地呆着还是和朋友出去聚会？'
        ]
      },
      general: {
        vocabulary: [
          '表达 (biǎodá): Diễn đạt, bày tỏ',
          '流利 (liúlì): Trôi chảy',
          '交流 (jiāoliú): Giao lưu, trò chuyện',
          '看法 (kànfǎ): Quan điểm, cách nhìn',
          '练习 (liànxí): Luyện tập'
        ],
        grammarTips: [
          'Sử dụng các phó từ liên kết như "不但...而且..." (Không những... mà còn...) để làm phong phú câu nói',
          'Sử dụng "依我看 / 在我看来..." để đưa ra nhận định cá nhân'
        ],
        conversationPrompts: [
          'Thảo luận phương pháp học tiếng Trung hiệu quả nhất của bạn.',
          'Tranh luận: AI có thể thay thế hoàn toàn phiên dịch viên tiếng Trung?',
          'Chia sẻ cảm nhận sau khi luyện nói tiếng Trung trên phòng học LUCY.'
        ],
        aiSuggestedQuestions: [
          '你觉得学习汉语最难的部分是什么？',
          '你每天花多少时间练习口语？',
          '你为什么选择学习汉语？'
        ]
      }
    },
    JA: {
      travel: {
        vocabulary: [
          '日程 (にってい): Lịch trình',
          '予約 (よやく): Đặt trước',
          '絶景 (ぜっけい): Tuyệt cảnh, phong cảnh cực đẹp',
          '名物料理 (めいぶつりょうり): Món ăn đặc sản địa phương',
          '観光地 (かんこうち): Địa điểm du lịch'
        ],
        grammarTips: [
          'Mẫu câu "〜に行きたいです" để diễn đạt mong muốn đi du lịch (Ví dụ: 日本に行きたいです。)',
          'Sử dụng "〜てみる" để nói về trải nghiệm thử (Ví dụ: 温泉に入ってみたいです。)'
        ],
        conversationPrompts: [
          'Đóng vai: Hỏi đường đi từ ga Tokyo đến chùa Sensoji.',
          'Giới thiệu địa điểm du lịch bạn yêu thích nhất bằng tiếng Nhật.',
          'Thảo luận: Bạn thích đi du lịch vào mùa đông hay mùa hè hơn?'
        ],
        aiSuggestedQuestions: [
          '日本で行ってみたい場所はどこですか。なぜですか。',
          '旅行に行くとき、一番楽しみにしていることは何ですか。',
          'ベトナムのおすすめの観光地を紹介してください。'
        ]
      },
      business: {
        vocabulary: [
          '履歴書 (りれきしょ): Sơ yếu lý lịch, CV',
          '面接 (めんせつ): Phỏng vấn',
          '協力 (きょうりょく): Hợp tác',
          '残業 (ざんぎょう): Làm thêm giờ (OT)',
          '効率 (こうりつ): Hiệu suất'
        ],
        grammarTips: [
          'Sử dụng thể lịch sự / kính ngữ cơ bản (Keigo) khi chào hỏi trong phỏng vấn (Ví dụ: 〜と申します)',
          'Sử dụng cấu trúc "〜たことがあります" để trình bày kinh nghiệm làm việc'
        ],
        conversationPrompts: [
          'Đóng vai: Phỏng vấn xin việc bằng tiếng Nhật vào công ty IT.',
          'Thảo luận về phong cách làm việc của doanh nghiệp Nhật Bản (Horenso, đúng giờ).',
          'Trình bày một ý tưởng cải tiến quy trình công việc hiện tại.'
        ],
        aiSuggestedQuestions: [
          'なぜ我が社に応募しようと思ったのですか。',
          '仕事で一番大切にしていることは何ですか。',
          'あなたの強みと弱みを教えてください。'
        ]
      },
      food: {
        vocabulary: [
          '看板メニュー (かんばんめにゅー): Món tủ của quán',
          '味わう (あじわう): Thưởng thức',
          '美味しい (おいしい): Ngon miệng',
          'アレルギー (あれるぎー): Dị ứng đồ ăn',
          'お会計 (おかいけい): Thanh toán hóa đơn'
        ],
        grammarTips: [
          'Sử dụng "〜にします" để quyết định gọi món (Ví dụ: 私は寿司にします。)',
          'Sử dụng "〜てください" để gọi món (Ví dụ: お水をください。)'
        ],
        conversationPrompts: [
          'Đóng vai: Đi ăn quán nhậu Izakaya và gọi món bằng tiếng Nhật.',
          'Giới thiệu một món ăn Nhật Bản bạn thích nhất (Ramen, Sushi, Takoyaki).',
          'Thảo luận: Ăn chay (Vegetarian) đang trở nên phổ biến, bạn nghĩ sao?'
        ],
        aiSuggestedQuestions: [
          '日本料理の中で何が一番好きですか。',
          '料理をするのは好きですか。得意料理は何ですか。',
          'ベトナム料理を紹介するなら、どの料理を選びますか。'
        ]
      },
      shopping: {
        vocabulary: [
          '割引 (わりびき): Giảm giá',
          '安い (やすい): Rẻ',
          '領収書 (りょうしゅうしょ): Hóa đơn thanh toán',
          '返品 (へんぴん): Trả hàng',
          '試着 (しちゃく): Thử quần áo'
        ],
        grammarTips: [
          'Mẫu câu hỏi size: "これのMサイズはありますか。"',
          'Mẫu câu hỏi giá: "これはいくらですか。"'
        ],
        conversationPrompts: [
          'Đóng vai: Hỏi mua sắm và xin giảm giá ở cửa hàng lưu niệm.',
          'Thảo luận: Lợi ích và rủi ro của việc mua sắm hàng hiệu đã qua sử dụng (Second-hand).',
          'Mô tả một món đồ đắt tiền nhất bạn từng tự mua.'
        ],
        aiSuggestedQuestions: [
          'ネットショッピングとお店で買うのと、どちらが好きですか。',
          '最近買ったもので、一番のお気に入りは何ですか。',
          '日本のブランドで好きなものはありますか。'
        ]
      },
      daily: {
        vocabulary: [
          '夜型 (よがた): Người sinh hoạt đêm',
          'リラックス (りらっくす): Thư giãn',
          '趣味 (しゅみ): Sở thích',
          '集まり (あつまり): Tụ tập, gặp gỡ',
          '充実 (じゅうじつ): Đầy đủ, trọn vẹn'
        ],
        grammarTips: [
          'Sử dụng "〜たり〜たりします" để liệt kê hoạt động ngày nghỉ (Ví dụ: 本を読んだり、音楽を聞いたりします。)',
          'Sử dụng "〜ながら" để nói về thói quen (Ví dụ: テレビを見ながら食事をします。)'
        ],
        conversationPrompts: [
          'Kể về thời gian biểu một ngày cuối tuần lý tưởng của bạn.',
          'Giới thiệu về một sở thích giúp bạn giảm căng thẳng cực tốt.',
          'Thảo luận: Thói quen thức khuya có tác hại như thế nào đối với Gen Z?'
        ],
        aiSuggestedQuestions: [
          '休日はいつも何時に起きますか。何をして過ごしますか。',
          '最近新しく始めた趣味はありますか。',
          '健康のために毎日気をつけていることはありますか。'
        ]
      },
      general: {
        vocabulary: [
          '表現 (ひょうげん): Diễn đạt, biểu hiện',
          '流暢 (りゅうちょう): Trôi chảy, lưu loát',
          '交流 (こうりゅう): Giao lưu, trao đổi',
          '意見 (いけん): Ý kiến, quan điểm',
          '練習 (れんしゅう): Luyện tập'
        ],
        grammarTips: [
          'Dùng "〜と思います" để đưa ra ý kiến cá nhân (Ví dụ: 日本語は面白いと思います。)',
          'Dùng các phó từ liên kết như "また" (hơn nữa), "しかし" (tuy nhiên) để diễn đạt mạch lạc'
        ],
        conversationPrompts: [
          'Thảo luận phương pháp ghi nhớ chữ Kanji tiếng Nhật hiệu quả nhất.',
          'Tranh luận: Tương lai AI dịch thuật có thay thế dịch giả tiếng Nhật không?',
          'Chia sẻ cảm nghĩ khi tham gia luyện giao tiếp nói tiếng Nhật trên LUCY.'
        ],
        aiSuggestedQuestions: [
          '日本語の勉強で一番大変なことは何ですか。',
          '毎日どのように日本語を練習していますか。',
          '日本語を学び始めたきっかけは何ですか。'
        ]
      }
    }
  };

  const selectedLang = language.toUpperCase() as Language;
  const langDb = database[selectedLang] || database.EN;
  const recommendations = langDb[theme] || langDb.general;

  // Personalize title inside recommendations slightly
  return {
    vocabulary: recommendations.vocabulary,
    grammarTips: recommendations.grammarTips,
    conversationPrompts: recommendations.conversationPrompts.map(p => 
      p.includes('Role-play') || p.includes('Đóng vai') ? p : `[Tài liệu: ${pin.title}] ${p}`
    ),
    aiSuggestedQuestions: recommendations.aiSuggestedQuestions.map(q => 
      `[Tài liệu: ${pin.title}] ${q}`
    )
  };
}
