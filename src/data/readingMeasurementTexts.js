/**
 * Fixoku sınıf bazlı okuma hızı ve okuduğunu anlama ölçüm metinleri.
 * Kaynak: düzeltilmiş öğretmen/okul ölçüm metinleri belgesi.
 *
 * Dağılım: 3. sınıf 10, 4. sınıf 10, 5–6. sınıf 5,
 * 7–8. sınıf 5, lise 10 metin.
 * Bu dosyada cevap anahtarları istemci tarafında bulunduğu için üretim
 * güvenliği gerektiren sınavlarda cevaplar ileride sunucuya taşınmalıdır.
 */

export const READING_GRADE_LABELS = {
  "3": "İlkokul 3. Sınıf",
  "4": "İlkokul 4. Sınıf",
  "5-6": "Ortaokul 5–6. Sınıf",
  "7-8": "Ortaokul 7–8. Sınıf",
  "lise": "Lise"
};

export const readingMeasurementTextsByGrade = {
  "3": [
    {
      "id": "grade-3-text-01",
      "grade": "3",
      "number": 1,
      "title": "ARILARIN KOVANDAKİ GÖREVLERİ",
      "paragraphs": [
        "Bir arı kovanında binlerce arı birlikte yaşar. Kovandaki her arının farklı bir görevi vardır. İşçi arılar, sabah erken saatlerde kovandan çıkar ve çiçeklerden nektar ile polen toplar. Bir işçi arı, uygun hava koşullarında günde yaklaşık 8 kez kovana gidip gelebilir. Her yolculukta birçok çiçeğe konar. Toplanan nektar, kovandaki diğer arılar tarafından petek gözlerine yerleştirilir. Arılar kanatlarını hızla çırparak nektarın içindeki suyun azalmasına yardım eder. Bir süre sonra nektar koyulaşır ve bala dönüşür.",
        "Kovanda yalnızca bal hazırlayan arılar bulunmaz. Bazı işçi arılar petekleri temizler, bazıları yavru arılarla ilgilenir, bazıları da kovanın girişini korur. Kraliçe arının görevi ise yumurtlamaktır. Arılar, görevlerini düzenli biçimde yaptıkları için kovandaki işler karışmaz.",
        "Bir arı yeterli çiçek bulamazsa kovana dönerek özel hareketlerle diğer arılara yön gösterir. Bu hareketler, çiçeklerin hangi tarafta ve ne kadar uzakta olduğunu anlatır. Böylece arılar aynı bölgeye boş yere gitmez. Birlikte çalışan arılar hem zaman kazanır hem de kovanın ihtiyaç duyduğu besini daha kolay toplar. Kovanın düzenli yaşamı, her arının kendi görevini dikkatle yapmasına bağlıdır."
      ],
      "content": "Bir arı kovanında binlerce arı birlikte yaşar. Kovandaki her arının farklı bir görevi vardır. İşçi arılar, sabah erken saatlerde kovandan çıkar ve çiçeklerden nektar ile polen toplar. Bir işçi arı, uygun hava koşullarında günde yaklaşık 8 kez kovana gidip gelebilir. Her yolculukta birçok çiçeğe konar. Toplanan nektar, kovandaki diğer arılar tarafından petek gözlerine yerleştirilir. Arılar kanatlarını hızla çırparak nektarın içindeki suyun azalmasına yardım eder. Bir süre sonra nektar koyulaşır ve bala dönüşür.\n\nKovanda yalnızca bal hazırlayan arılar bulunmaz. Bazı işçi arılar petekleri temizler, bazıları yavru arılarla ilgilenir, bazıları da kovanın girişini korur. Kraliçe arının görevi ise yumurtlamaktır. Arılar, görevlerini düzenli biçimde yaptıkları için kovandaki işler karışmaz.\n\nBir arı yeterli çiçek bulamazsa kovana dönerek özel hareketlerle diğer arılara yön gösterir. Bu hareketler, çiçeklerin hangi tarafta ve ne kadar uzakta olduğunu anlatır. Böylece arılar aynı bölgeye boş yere gitmez. Birlikte çalışan arılar hem zaman kazanır hem de kovanın ihtiyaç duyduğu besini daha kolay toplar. Kovanın düzenli yaşamı, her arının kendi görevini dikkatle yapmasına bağlıdır.",
      "wordCount": 162,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Arıların kovandaki görevlerini ve birlikte çalışmalarını açıklamak"
            },
            {
              "key": "B",
              "text": "Arıların yalnızca bal üretmek için yaşadığını göstermek"
            },
            {
              "key": "C",
              "text": "Kovanların hangi malzemelerden yapıldığını tanıtmak"
            },
            {
              "key": "D",
              "text": "Çiçeklerin farklı mevsimlerde nasıl açtığını anlatmak"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q2",
          "question": "Nektarın bala dönüşmesine arılar nasıl yardımcı olur?",
          "options": [
            {
              "key": "A",
              "text": "Petekleri kovanın dışına taşıyarak"
            },
            {
              "key": "B",
              "text": "Nektarı yavru arılara vererek"
            },
            {
              "key": "C",
              "text": "Kanatlarını çırpıp nektardaki suyu azaltarak"
            },
            {
              "key": "D",
              "text": "Kovanın girişini sürekli açık tutarak"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Bir işçi arı iki gün boyunca her gün 8 kez kovana gidip gelirse toplam kaç kez gidip gelmiş olur?",
          "options": [
            {
              "key": "A",
              "text": "14"
            },
            {
              "key": "B",
              "text": "16"
            },
            {
              "key": "C",
              "text": "18"
            },
            {
              "key": "D",
              "text": "24"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q4",
          "question": "Arılar çiçeklerin yerini birbirlerine göstermeseydi aşağıdakilerden hangisi yaşanabilirdi?",
          "options": [
            {
              "key": "A",
              "text": "Besin bulmak için daha fazla zaman harcayabilirlerdi."
            },
            {
              "key": "B",
              "text": "Nektar çok daha kısa sürede bala dönüşebilirdi."
            },
            {
              "key": "C",
              "text": "Kovandaki bütün arılar aynı görevi yapabilirdi."
            },
            {
              "key": "D",
              "text": "Peteklerin temizlenmesine gerek kalmayabilirdi."
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q5",
          "question": "Metne göre aşağıdakilerden hangisi söylenebilir?",
          "options": [
            {
              "key": "A",
              "text": "Kovandaki bütün işleri kraliçe arı yönetmektedir."
            },
            {
              "key": "B",
              "text": "Yalnızca dışarı çıkan arılar kovan için önemlidir."
            },
            {
              "key": "C",
              "text": "Her arının aynı işi yapması kovanın düzenini sağlar."
            },
            {
              "key": "D",
              "text": "Görev paylaşımı, kovan yaşamının düzenli sürmesine yardımcı olur."
            }
          ],
          "correctAnswer": "D"
        }
      ]
    },
    {
      "id": "grade-3-text-02",
      "grade": "3",
      "number": 2,
      "title": "BİR TOHUMUN FİDANA DÖNÜŞMESİ",
      "paragraphs": [
        "Küçük bir tohum, uygun koşullar oluştuğunda büyümeye başlar. Bunun için suya, havaya ve uygun sıcaklığa ihtiyaç duyar. Tohum toprağa ekildikten sonra önce suyu içine çeker ve şişer. Ardından kabuğu yumuşar. Tohumun içindeki küçük kök aşağı doğru uzanırken filiz yukarı doğru ilerler. Böylece bitki hem toprağa tutunur hem de ışığa ulaşmaya çalışır.",
        "İlk yapraklar açıldığında genç bitki kendi besinini üretmeye başlar. Kökleri ise topraktan su ve mineralleri alır. Bir bahçıvan, aynı türden 12 tohumu üç eşit sıraya dikmiştir. Her sırada 4 tohum bulunmaktadır. Ancak bütün tohumlar aynı anda filizlenmez. Bazıları birkaç gün erken, bazıları ise daha geç çıkabilir. Bunun nedeni toprağın nemi, sıcaklığı ve tohumun yapısıdır.",
        "Fidan büyüdükçe gövdesi kalınlaşır ve yeni yapraklar çıkarır. Yeterli ışık almayan bir fidan zayıf kalabilir. Fazla su verilen bir fidanın kökleri de zarar görebilir. Bu yüzden bitkinin düzenli biçimde sulanması ve uygun bir yerde yetiştirilmesi gerekir. Bahçıvan, fidanları her gün gözlemleyerek gelişimlerini dikkatle takip eder. Küçük bir tohumun sağlıklı bir fidana dönüşmesi zaman, dikkat ve doğru bakım ister."
      ],
      "content": "Küçük bir tohum, uygun koşullar oluştuğunda büyümeye başlar. Bunun için suya, havaya ve uygun sıcaklığa ihtiyaç duyar. Tohum toprağa ekildikten sonra önce suyu içine çeker ve şişer. Ardından kabuğu yumuşar. Tohumun içindeki küçük kök aşağı doğru uzanırken filiz yukarı doğru ilerler. Böylece bitki hem toprağa tutunur hem de ışığa ulaşmaya çalışır.\n\nİlk yapraklar açıldığında genç bitki kendi besinini üretmeye başlar. Kökleri ise topraktan su ve mineralleri alır. Bir bahçıvan, aynı türden 12 tohumu üç eşit sıraya dikmiştir. Her sırada 4 tohum bulunmaktadır. Ancak bütün tohumlar aynı anda filizlenmez. Bazıları birkaç gün erken, bazıları ise daha geç çıkabilir. Bunun nedeni toprağın nemi, sıcaklığı ve tohumun yapısıdır.\n\nFidan büyüdükçe gövdesi kalınlaşır ve yeni yapraklar çıkarır. Yeterli ışık almayan bir fidan zayıf kalabilir. Fazla su verilen bir fidanın kökleri de zarar görebilir. Bu yüzden bitkinin düzenli biçimde sulanması ve uygun bir yerde yetiştirilmesi gerekir. Bahçıvan, fidanları her gün gözlemleyerek gelişimlerini dikkatle takip eder. Küçük bir tohumun sağlıklı bir fidana dönüşmesi zaman, dikkat ve doğru bakım ister.",
      "wordCount": 163,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Bahçıvanların kullandığı araçları tanıtmak"
            },
            {
              "key": "B",
              "text": "Bir tohumun büyüme aşamalarını ve ihtiyaçlarını açıklamak"
            },
            {
              "key": "C",
              "text": "Farklı bitki türlerinin yapraklarını karşılaştırmak"
            },
            {
              "key": "D",
              "text": "Tohumların hangi mevsimde toplandığını anlatmak"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Tohum filizlenmeye başladığında kök ve filiz hangi yönlere doğru ilerler?",
          "options": [
            {
              "key": "A",
              "text": "Kök yukarı, filiz aşağı doğru ilerler."
            },
            {
              "key": "B",
              "text": "Kök ve filiz toprağın altında yan yana ilerler."
            },
            {
              "key": "C",
              "text": "Kök aşağı, filiz yukarı doğru ilerler."
            },
            {
              "key": "D",
              "text": "Kök ve filiz aynı yönde ilerler."
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Bahçıvanın diktiği tohumların iki sırasındaki toplam tohum sayısı kaçtır?",
          "options": [
            {
              "key": "A",
              "text": "6"
            },
            {
              "key": "B",
              "text": "8"
            },
            {
              "key": "C",
              "text": "10"
            },
            {
              "key": "D",
              "text": "12"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q4",
          "question": "Aynı türden olan tohumların farklı zamanlarda filizlenmesinin nedeni ne olabilir?",
          "options": [
            {
              "key": "A",
              "text": "Her tohumun farklı bir bitkiye dönüşmesi"
            },
            {
              "key": "B",
              "text": "Bahçıvanın bütün tohumları aynı sıraya dikmesi"
            },
            {
              "key": "C",
              "text": "Yaprakların köklerden önce büyümeye başlaması"
            },
            {
              "key": "D",
              "text": "Toprak nemi ve sıcaklığının her yerde aynı olmaması"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q5",
          "question": "Metne göre bir fidanın sağlıklı büyümesi için aşağıdakilerden hangisi önemlidir?",
          "options": [
            {
              "key": "A",
              "text": "İhtiyacına uygun miktarda su ve yeterli ışık alması"
            },
            {
              "key": "B",
              "text": "Her gün bulunduğu toprağın değiştirilmesi"
            },
            {
              "key": "C",
              "text": "Sürekli karanlık bir yerde tutulması"
            },
            {
              "key": "D",
              "text": "Köklerinin sık sık topraktan çıkarılması"
            }
          ],
          "correctAnswer": "A"
        }
      ]
    },
    {
      "id": "grade-3-text-03",
      "grade": "3",
      "number": 3,
      "title": "YUNUSLAR NASIL HABERLEŞİR?",
      "paragraphs": [
        "Yunuslar, denizlerde yaşayan zeki ve sosyal hayvanlardır. Genellikle gruplar hâlinde hareket ederler. Bu gruplara sürü adı verilir. Yunuslar birbirleriyle ıslık benzeri sesler çıkararak haberleşir. Her yunusun kendine özgü bir sesi olabilir. Bu özel ses, diğer yunusların onu tanımasına yardımcı olur. Birbirlerinden uzaklaştıklarında bile bu sesler sayesinde sürüdeki yerlerini kolayca belirleyebilirler.",
        "Yunuslar yalnızca ses çıkarmakla kalmaz, çevrelerini anlamak için de seslerden yararlanır. Çıkardıkları sesler suyun içindeki bir cisme çarparak geri döner. Yunus, dönen sesi dinleyerek cismin yerini ve uzaklığını anlayabilir. Bu yönteme yankıyla yön bulma denir. Bir yunus araştırma sırasında sabah 6 kez, öğleden sonra 4 kez ses çıkararak yankıyı dikkatle dinlemiştir.",
        "Yunuslar sürü hâlinde gezerken birbirlerini korur ve yiyecek bulmada yardımlaşır. Sürüdeki bir yunus tehlike fark ettiğinde diğerlerini seslerle uyarabilir. Anne yunuslar da yavrularını uzun süre yanında tutar. Yavrular, yüzmeyi ve avlanmayı büyüklerini izleyerek öğrenir. Yunusların birlikte hareket etmesi hem güvenliklerini artırır hem de denizde yaşamlarını kolaylaştırır. Bu nedenle haberleşme, yunuslar için yalnızca ses çıkarmak değil, birlikte yaşamanın önemli bir parçasıdır."
      ],
      "content": "Yunuslar, denizlerde yaşayan zeki ve sosyal hayvanlardır. Genellikle gruplar hâlinde hareket ederler. Bu gruplara sürü adı verilir. Yunuslar birbirleriyle ıslık benzeri sesler çıkararak haberleşir. Her yunusun kendine özgü bir sesi olabilir. Bu özel ses, diğer yunusların onu tanımasına yardımcı olur. Birbirlerinden uzaklaştıklarında bile bu sesler sayesinde sürüdeki yerlerini kolayca belirleyebilirler.\n\nYunuslar yalnızca ses çıkarmakla kalmaz, çevrelerini anlamak için de seslerden yararlanır. Çıkardıkları sesler suyun içindeki bir cisme çarparak geri döner. Yunus, dönen sesi dinleyerek cismin yerini ve uzaklığını anlayabilir. Bu yönteme yankıyla yön bulma denir. Bir yunus araştırma sırasında sabah 6 kez, öğleden sonra 4 kez ses çıkararak yankıyı dikkatle dinlemiştir.\n\nYunuslar sürü hâlinde gezerken birbirlerini korur ve yiyecek bulmada yardımlaşır. Sürüdeki bir yunus tehlike fark ettiğinde diğerlerini seslerle uyarabilir. Anne yunuslar da yavrularını uzun süre yanında tutar. Yavrular, yüzmeyi ve avlanmayı büyüklerini izleyerek öğrenir. Yunusların birlikte hareket etmesi hem güvenliklerini artırır hem de denizde yaşamlarını kolaylaştırır. Bu nedenle haberleşme, yunuslar için yalnızca ses çıkarmak değil, birlikte yaşamanın önemli bir parçasıdır.",
      "wordCount": 161,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Yunusların vücut yapılarını diğer deniz canlılarıyla karşılaştırmak"
            },
            {
              "key": "B",
              "text": "Yunusların seslerle haberleşmesini ve birlikte yaşamasını açıklamak"
            },
            {
              "key": "C",
              "text": "Deniz suyunun hangi özelliklere sahip olduğunu anlatmak"
            },
            {
              "key": "D",
              "text": "Yunuslara hangi hareketlerin öğretilebildiğini göstermek"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Yunuslar suyun içindeki bir cismin yerini nasıl anlayabilir?",
          "options": [
            {
              "key": "A",
              "text": "Cismin su üzerinde bıraktığı izi izleyerek"
            },
            {
              "key": "B",
              "text": "Diğer yunusların gittiği yönü takip ederek"
            },
            {
              "key": "C",
              "text": "Çıkardıkları sesin cisimden dönmesini dinleyerek"
            },
            {
              "key": "D",
              "text": "Cismin kokusunu uzaktan fark ederek"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Araştırmadaki yunus bir günde toplam kaç kez ses çıkarmıştır?",
          "options": [
            {
              "key": "A",
              "text": "10"
            },
            {
              "key": "B",
              "text": "8"
            },
            {
              "key": "C",
              "text": "12"
            },
            {
              "key": "D",
              "text": "24"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q4",
          "question": "Bir yunus çıkardığı sesin geri dönen yankısını duyamazsa aşağıdakilerden hangisinde zorlanabilir?",
          "options": [
            {
              "key": "A",
              "text": "Suyun sıcaklığını anlamakta"
            },
            {
              "key": "B",
              "text": "Yavrularını beslemekte"
            },
            {
              "key": "C",
              "text": "Suyun yüzeyine çıkmakta"
            },
            {
              "key": "D",
              "text": "Çevresindeki cisimlerin yerini belirlemekte"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q5",
          "question": "Metne göre yunusların sürü hâlinde yaşaması onlara nasıl bir yarar sağlar?",
          "options": [
            {
              "key": "A",
              "text": "Bütün yunusların aynı sesi çıkarmasını sağlar."
            },
            {
              "key": "B",
              "text": "Tehlikelerden korunmalarını ve yiyecek bulmalarını kolaylaştırır."
            },
            {
              "key": "C",
              "text": "Deniz içinde daha uzun süre uyumalarına yardımcı olur."
            },
            {
              "key": "D",
              "text": "Her yunusun sürüden ayrı hareket etmesini sağlar."
            }
          ],
          "correctAnswer": "B"
        }
      ]
    },
    {
      "id": "grade-3-text-04",
      "grade": "3",
      "number": 4,
      "title": "KÜTÜPHANEDEKİ KİTAPLAR NASIL DÜZENLENİR?",
      "paragraphs": [
        "Bir kütüphanede yüzlerce, bazen binlerce kitap bulunur. Okuyucuların aradıkları kitabı kolayca bulabilmesi için kitaplar belirli bir düzene göre yerleştirilir. Önce kitapların konusu belirlenir. Hikâye, bilim, tarih ve doğa kitapları farklı bölümlere ayrılır. Daha sonra her kitabın sırtına, bulunduğu bölümü gösteren bir etiket yapıştırılır.",
        "Kütüphaneci, yeni gelen 15 kitabın 5’ini bilim, 4’ünü tarih bölümüne yerleştirmiştir. Geri kalan kitaplar ise hikâye bölümüne ayrılmıştır. Kitaplar raflara dizilirken yazar adları ya da kitap numaraları da dikkate alınabilir. Böylece aynı bölümdeki kitaplar karışmaz. Rafların üzerinde bölüm adlarının yazılı olması, okuyucuların doğru alana yönelmesini sağlar. Bazı kütüphanelerde kitapların yerini gösteren küçük bilgisayar ekranları da bulunur.",
        "Bir okuyucu kitabı aldıktan sonra onu kendi seçtiği rafa bırakmamalıdır. Çünkü yanlış yere konulan bir kitabı bulmak uzun sürebilir. Bu nedenle geri getirilen kitaplar önce görevliye teslim edilir. Kütüphaneci kitabın etiketini kontrol eder ve doğru yerine koyar.",
        "Kütüphanedeki düzen yalnızca kitapları korumaz; okuyucuların zaman kazanmasına da yardımcı olur. Herkes kurallara uyduğunda hem kitaplar kolay bulunur hem de kütüphane daha düzenli bir çalışma alanı olur."
      ],
      "content": "Bir kütüphanede yüzlerce, bazen binlerce kitap bulunur. Okuyucuların aradıkları kitabı kolayca bulabilmesi için kitaplar belirli bir düzene göre yerleştirilir. Önce kitapların konusu belirlenir. Hikâye, bilim, tarih ve doğa kitapları farklı bölümlere ayrılır. Daha sonra her kitabın sırtına, bulunduğu bölümü gösteren bir etiket yapıştırılır.\n\nKütüphaneci, yeni gelen 15 kitabın 5’ini bilim, 4’ünü tarih bölümüne yerleştirmiştir. Geri kalan kitaplar ise hikâye bölümüne ayrılmıştır. Kitaplar raflara dizilirken yazar adları ya da kitap numaraları da dikkate alınabilir. Böylece aynı bölümdeki kitaplar karışmaz. Rafların üzerinde bölüm adlarının yazılı olması, okuyucuların doğru alana yönelmesini sağlar. Bazı kütüphanelerde kitapların yerini gösteren küçük bilgisayar ekranları da bulunur.\n\nBir okuyucu kitabı aldıktan sonra onu kendi seçtiği rafa bırakmamalıdır. Çünkü yanlış yere konulan bir kitabı bulmak uzun sürebilir. Bu nedenle geri getirilen kitaplar önce görevliye teslim edilir. Kütüphaneci kitabın etiketini kontrol eder ve doğru yerine koyar.\n\nKütüphanedeki düzen yalnızca kitapları korumaz; okuyucuların zaman kazanmasına da yardımcı olur. Herkes kurallara uyduğunda hem kitaplar kolay bulunur hem de kütüphane daha düzenli bir çalışma alanı olur.",
      "wordCount": 163,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Kütüphanelerde hangi kitapların daha çok okunduğunu açıklamak"
            },
            {
              "key": "B",
              "text": "Kitapların nasıl yazıldığını ve basıldığını anlatmak"
            },
            {
              "key": "C",
              "text": "Kütüphanedeki kitapların hangi düzene göre yerleştirildiğini açıklamak"
            },
            {
              "key": "D",
              "text": "Okuyucuların kütüphanede ne kadar süre kaldığını göstermek"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "Kitapların sırtına etiket yapıştırılmasının nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Kitabın bulunduğu bölümü göstermesi"
            },
            {
              "key": "B",
              "text": "Kitabın daha yeni görünmesini sağlaması"
            },
            {
              "key": "C",
              "text": "Okuyucunun kitabı satın almasını kolaylaştırması"
            },
            {
              "key": "D",
              "text": "Kitabın sayfa sayısını belirtmesi"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "Kütüphaneci yeni gelen kitapların kaçını bilim bölümüne yerleştirmiştir?",
          "options": [
            {
              "key": "A",
              "text": "4"
            },
            {
              "key": "B",
              "text": "5"
            },
            {
              "key": "C",
              "text": "10"
            },
            {
              "key": "D",
              "text": "15"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q4",
          "question": "Bir okuyucu aldığı kitabı yanlış bir rafa bırakırsa aşağıdakilerden hangisi yaşanabilir?",
          "options": [
            {
              "key": "A",
              "text": "Kitabın konusu değişebilir."
            },
            {
              "key": "B",
              "text": "Başka bir okuyucu kitabı bulmakta zorlanabilir."
            },
            {
              "key": "C",
              "text": "Kütüphanedeki bütün kitaplar yeniden etiketlenebilir."
            },
            {
              "key": "D",
              "text": "Kitap başka bir bölüme ait hâle gelebilir."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "Metne göre kütüphane kurallarına uyulması neden önemlidir?",
          "options": [
            {
              "key": "A",
              "text": "Okuyucuların yalnızca aynı tür kitapları seçmesini sağlar."
            },
            {
              "key": "B",
              "text": "Kütüphanecinin kitapları daha az kontrol etmesini sağlar."
            },
            {
              "key": "C",
              "text": "Kitapların kolay bulunmasına ve düzenin korunmasına yardımcı olur."
            },
            {
              "key": "D",
              "text": "Raflardaki kitap sayısının her gün aynı kalmasını sağlar."
            }
          ],
          "correctAnswer": "C"
        }
      ]
    },
    {
      "id": "grade-3-text-05",
      "grade": "3",
      "number": 5,
      "title": "YAĞMURUN GÖKYÜZÜNDEN YERYÜZÜNE YOLCULUĞU",
      "paragraphs": [
        "Güneş, denizleri, gölleri ve toprağı ısıttığında suyun bir bölümü buharlaşarak havaya karışır. Su buharı gözle görülmez ve sıcak havayla birlikte yükselir. Yükseklere çıktıkça hava soğur. Soğuyan su buharı, çok küçük su damlalarına dönüşür. Bu damlalar bir araya gelerek bulutları oluşturur.",
        "Bulutların içindeki damlalar başlangıçta çok hafiftir. Bu nedenle havada kalabilirler. Ancak damlalar birleşip büyüdükçe ağırlaşır. Yeterince ağır olan damlalar yağmur olarak yeryüzüne düşer. Rüzgâr, bulutları farklı bölgelere taşıyabildiği için yağmur her yerde aynı anda başlamaz. Bir gözlem sırasında yağmur sabah saat 9’da başlamış ve yaklaşık 25 dakika sürmüştür. Yağan suyun bir bölümü toprağa sızar, bir bölümü derelere ve göllere ulaşır. Güneş yeniden ısıttığında bu suların bir kısmı tekrar buharlaşır.",
        "Yağmur, bitkilerin büyümesine ve canlıların su ihtiyacının karşılanmasına yardım eder. Toprağa sızan su, bitki köklerinin kullanabileceği nemi oluşturur. Fakat çok kısa sürede aşırı yağış olduğunda su birikintileri oluşabilir. Bu nedenle yağmur hem doğa için gerekli hem de dikkatle izlenmesi gereken bir hava olayıdır. Suyun gökyüzü ile yeryüzü arasındaki bu sürekli hareketine su döngüsü denir."
      ],
      "content": "Güneş, denizleri, gölleri ve toprağı ısıttığında suyun bir bölümü buharlaşarak havaya karışır. Su buharı gözle görülmez ve sıcak havayla birlikte yükselir. Yükseklere çıktıkça hava soğur. Soğuyan su buharı, çok küçük su damlalarına dönüşür. Bu damlalar bir araya gelerek bulutları oluşturur.\n\nBulutların içindeki damlalar başlangıçta çok hafiftir. Bu nedenle havada kalabilirler. Ancak damlalar birleşip büyüdükçe ağırlaşır. Yeterince ağır olan damlalar yağmur olarak yeryüzüne düşer. Rüzgâr, bulutları farklı bölgelere taşıyabildiği için yağmur her yerde aynı anda başlamaz. Bir gözlem sırasında yağmur sabah saat 9’da başlamış ve yaklaşık 25 dakika sürmüştür. Yağan suyun bir bölümü toprağa sızar, bir bölümü derelere ve göllere ulaşır. Güneş yeniden ısıttığında bu suların bir kısmı tekrar buharlaşır.\n\nYağmur, bitkilerin büyümesine ve canlıların su ihtiyacının karşılanmasına yardım eder. Toprağa sızan su, bitki köklerinin kullanabileceği nemi oluşturur. Fakat çok kısa sürede aşırı yağış olduğunda su birikintileri oluşabilir. Bu nedenle yağmur hem doğa için gerekli hem de dikkatle izlenmesi gereken bir hava olayıdır. Suyun gökyüzü ile yeryüzü arasındaki bu sürekli hareketine su döngüsü denir.",
      "wordCount": 163,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Farklı bulut türlerinin görünüşlerini karşılaştırmak"
            },
            {
              "key": "B",
              "text": "Yağmurlu havalarda alınacak önlemleri sıralamak"
            },
            {
              "key": "C",
              "text": "Göllerde yaşayan canlıların özelliklerini tanıtmak"
            },
            {
              "key": "D",
              "text": "Yağmurun nasıl oluştuğunu ve suyun hareketini açıklamak"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q2",
          "question": "Bulutlar nasıl oluşur?",
          "options": [
            {
              "key": "A",
              "text": "Yağmur damlalarının toprağa sızmasıyla"
            },
            {
              "key": "B",
              "text": "Küçük su damlalarının bir araya gelmesiyle"
            },
            {
              "key": "C",
              "text": "Rüzgârın göllerdeki suyu hareket ettirmesiyle"
            },
            {
              "key": "D",
              "text": "Bitki köklerinin topraktaki suyu çekmesiyle"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q3",
          "question": "Metindeki gözleme göre yağmur saat kaçta başlamıştır?",
          "options": [
            {
              "key": "A",
              "text": "08.00"
            },
            {
              "key": "B",
              "text": "08.30"
            },
            {
              "key": "C",
              "text": "09.00"
            },
            {
              "key": "D",
              "text": "09.30"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q4",
          "question": "Bulutların içindeki su damlaları büyüyüp ağırlaştığında ne olur?",
          "options": [
            {
              "key": "A",
              "text": "Yağmur olarak yeryüzüne düşerler."
            },
            {
              "key": "B",
              "text": "Yeniden görünmez su buharına dönüşürler."
            },
            {
              "key": "C",
              "text": "Rüzgâr olmadan gökyüzünde yükselirler."
            },
            {
              "key": "D",
              "text": "Bulutların tamamen kaybolmasını sağlarlar."
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q5",
          "question": "Metne göre güneş, yağmurdan sonra yeryüzündeki suları yeniden ısıtırsa ne gerçekleşebilir?",
          "options": [
            {
              "key": "A",
              "text": "Bulutların hareketi tamamen durabilir."
            },
            {
              "key": "B",
              "text": "Topraktaki bütün su bir anda yok olabilir."
            },
            {
              "key": "C",
              "text": "Yağmur damlaları doğrudan buz hâline gelebilir."
            },
            {
              "key": "D",
              "text": "Suyun bir bölümü buharlaşarak yeniden havaya karışabilir."
            }
          ],
          "correctAnswer": "D"
        }
      ]
    },
    {
      "id": "grade-3-text-06",
      "grade": "3",
      "number": 6,
      "title": "KARINCALARIN BİRLİKTE ÇALIŞMASI",
      "paragraphs": [
        "Karıncalar, küçük olmalarına rağmen birlikte çalışarak büyük işler başarabilir. Bir karınca yuvasında farklı görevleri olan birçok karınca yaşar. İşçi karıncalar yiyecek bulur, yuvayı temizler ve yavrularla ilgilenir. Bazı karıncalar ise yuvanın girişini korur. Her karınca kendi görevini yaptığı için yuvadaki düzen bozulmaz.",
        "Bir işçi karınca yiyecek bulduğunda, geçtiği yola özel bir koku bırakır. Diğer karıncalar bu kokuyu takip ederek yiyeceğin bulunduğu yere ulaşır. Böylece her karınca ayrı ayrı yol aramak zorunda kalmaz. Bir gözlemde, karıncaların ortalama kendi ağırlıklarının 20 katı kadar yük taşıyabildikleri gözlemlenmiştir.",
        "Karıncalar, kendilerinden ağır yiyecekleri de birlikte taşıyabilir. Tek başına hareket eden bir karınca büyük bir parçayı götüremese bile birkaç karınca aynı anda çalıştığında bunu başarabilir. Yağmur başladığında yuvanın zarar görmemesi için girişleri güçlendirebilirler. Yiyecekleri de daha güvenli bölümlere taşırlar.",
        "Karıncaların başarısının temelinde görev paylaşımı ve haberleşme vardır. Her biri yalnızca kendi işini düşünseydi yiyecek bulmak, yuvayı korumak ve yavrulara bakmak çok daha zor olurdu. Birlikte hareket etmeleri, yuvadaki yaşamın düzenli ve güvenli biçimde sürmesini sağlar."
      ],
      "content": "Karıncalar, küçük olmalarına rağmen birlikte çalışarak büyük işler başarabilir. Bir karınca yuvasında farklı görevleri olan birçok karınca yaşar. İşçi karıncalar yiyecek bulur, yuvayı temizler ve yavrularla ilgilenir. Bazı karıncalar ise yuvanın girişini korur. Her karınca kendi görevini yaptığı için yuvadaki düzen bozulmaz.\n\nBir işçi karınca yiyecek bulduğunda, geçtiği yola özel bir koku bırakır. Diğer karıncalar bu kokuyu takip ederek yiyeceğin bulunduğu yere ulaşır. Böylece her karınca ayrı ayrı yol aramak zorunda kalmaz. Bir gözlemde, karıncaların ortalama kendi ağırlıklarının 20 katı kadar yük taşıyabildikleri gözlemlenmiştir.\n\nKarıncalar, kendilerinden ağır yiyecekleri de birlikte taşıyabilir. Tek başına hareket eden bir karınca büyük bir parçayı götüremese bile birkaç karınca aynı anda çalıştığında bunu başarabilir. Yağmur başladığında yuvanın zarar görmemesi için girişleri güçlendirebilirler. Yiyecekleri de daha güvenli bölümlere taşırlar.\n\nKarıncaların başarısının temelinde görev paylaşımı ve haberleşme vardır. Her biri yalnızca kendi işini düşünseydi yiyecek bulmak, yuvayı korumak ve yavrulara bakmak çok daha zor olurdu. Birlikte hareket etmeleri, yuvadaki yaşamın düzenli ve güvenli biçimde sürmesini sağlar.",
      "wordCount": 159,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Karıncaların hangi mevsimlerde yuva kurduğunu anlatmak"
            },
            {
              "key": "B",
              "text": "Karınca yuvalarının toprağın altında nasıl yapıldığını açıklamak"
            },
            {
              "key": "C",
              "text": "Karıncaların görev paylaşımı yaparak birlikte çalışmasını anlatmak"
            },
            {
              "key": "D",
              "text": "Karıncaların farklı türlerini ve görünüşlerini tanıtmak"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "Yiyecek bulan bir karınca, diğer karıncaların yolu bulmasına nasıl yardımcı olur?",
          "options": [
            {
              "key": "A",
              "text": "Geçtiği yola özel bir koku bırakarak"
            },
            {
              "key": "B",
              "text": "Yiyeceği tek başına yuvaya taşıyarak"
            },
            {
              "key": "C",
              "text": "Yuvanın girişini daha geniş hâle getirerek"
            },
            {
              "key": "D",
              "text": "Diğer karıncaları yuvanın içinde bekleterek"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "Metne göre karıncalar vücut ağırlıklarının kaç katı kadar yük taşıyabilir?",
          "options": [
            {
              "key": "A",
              "text": "12"
            },
            {
              "key": "B",
              "text": "18"
            },
            {
              "key": "C",
              "text": "20"
            },
            {
              "key": "D",
              "text": "28"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q4",
          "question": "Karıncaların geçtiği yola koku bırakmaması durumunda aşağıdakilerden hangisi yaşanabilir?",
          "options": [
            {
              "key": "A",
              "text": "Yuvanın girişini korumaya gerek kalmayabilir."
            },
            {
              "key": "B",
              "text": "Büyük yiyecek parçaları daha hafif olabilir."
            },
            {
              "key": "C",
              "text": "Yuvadaki bütün karıncalar aynı görevi yapabilir."
            },
            {
              "key": "D",
              "text": "Diğer karıncalar yiyeceğin bulunduğu yeri daha zor bulabilir."
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q5",
          "question": "Metne göre karıncaların ağır yiyecekleri taşıyabilmesi neyi göstermektedir?",
          "options": [
            {
              "key": "A",
              "text": "Yalnız çalışan karıncaların daha hızlı olduğunu"
            },
            {
              "key": "B",
              "text": "Karıncaların yalnızca küçük yiyecekleri seçtiğini"
            },
            {
              "key": "C",
              "text": "Birlikte çalışmanın zor işleri kolaylaştırdığını"
            },
            {
              "key": "D",
              "text": "Bütün karıncaların aynı güçte olduğunu"
            }
          ],
          "correctAnswer": "C"
        }
      ]
    },
    {
      "id": "grade-3-text-07",
      "grade": "3",
      "number": 7,
      "title": "GERİ DÖNÜŞÜM KUTUSUNDAN YENİ ÜRÜNE",
      "paragraphs": [
        "Evlerde kullanılan kâğıt, cam, metal ve plastik ürünlerin bir bölümü geri dönüştürülebilir. Bu atıklar doğru kutulara atıldığında çöplerle karışmadan geri dönüşüm tesisine gönderilir. Tesiste önce malzemeler türlerine göre ayrılır. Üzerlerindeki yiyecek kalıntıları ve yabancı maddeler temizlenir. Daha sonra her malzeme farklı işlemlerden geçirilir.",
        "Kullanılmış kâğıtlar küçük parçalara ayrılır ve suyla karıştırılarak hamur hâline getirilir. Bu hamur temizlenip düzleştirildikten sonra yeni kâğıt veya karton üretiminde kullanılabilir. Ancak kâğıt lifleri sonsuza kadar kullanılamaz. Lifler her işlemde biraz kısaldığı için genellikle 5 ile 7 kez geri dönüştürülebilir. Cam şişeler kırılıp eritilerek, metal kutular da parçalanıp yüksek sıcaklıkta işlenerek yeni ürünlere dönüştürülebilir. Plastik ürünler ise türlerine göre ayrılır, yıkanır ve küçük parçalara bölünerek yeniden üretime hazırlanır.",
        "Geri dönüşüm kutusuna atılan malzemelerin temiz olması önemlidir. Yağlı bir kâğıt ya da içinde yiyecek bulunan kap, diğer atıkları da kirletebilir. İnsanlar atıkları doğru ayırdığında kullanılabilecek malzemeler çöpe gitmez. Böylece doğal kaynaklar daha dikkatli kullanılır, çöp miktarı azalır ve eski bir ürün yeni bir eşya olarak yeniden karşımıza çıkabilir."
      ],
      "content": "Evlerde kullanılan kâğıt, cam, metal ve plastik ürünlerin bir bölümü geri dönüştürülebilir. Bu atıklar doğru kutulara atıldığında çöplerle karışmadan geri dönüşüm tesisine gönderilir. Tesiste önce malzemeler türlerine göre ayrılır. Üzerlerindeki yiyecek kalıntıları ve yabancı maddeler temizlenir. Daha sonra her malzeme farklı işlemlerden geçirilir.\n\nKullanılmış kâğıtlar küçük parçalara ayrılır ve suyla karıştırılarak hamur hâline getirilir. Bu hamur temizlenip düzleştirildikten sonra yeni kâğıt veya karton üretiminde kullanılabilir. Ancak kâğıt lifleri sonsuza kadar kullanılamaz. Lifler her işlemde biraz kısaldığı için genellikle 5 ile 7 kez geri dönüştürülebilir. Cam şişeler kırılıp eritilerek, metal kutular da parçalanıp yüksek sıcaklıkta işlenerek yeni ürünlere dönüştürülebilir. Plastik ürünler ise türlerine göre ayrılır, yıkanır ve küçük parçalara bölünerek yeniden üretime hazırlanır.\n\nGeri dönüşüm kutusuna atılan malzemelerin temiz olması önemlidir. Yağlı bir kâğıt ya da içinde yiyecek bulunan kap, diğer atıkları da kirletebilir. İnsanlar atıkları doğru ayırdığında kullanılabilecek malzemeler çöpe gitmez. Böylece doğal kaynaklar daha dikkatli kullanılır, çöp miktarı azalır ve eski bir ürün yeni bir eşya olarak yeniden karşımıza çıkabilir.",
      "wordCount": 161,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Evlerde en çok kullanılan ürünleri karşılaştırmak"
            },
            {
              "key": "B",
              "text": "Atıkların geri dönüşüm sürecini ve bunun önemini açıklamak"
            },
            {
              "key": "C",
              "text": "Geri dönüşüm kutularının nasıl üretildiğini anlatmak"
            },
            {
              "key": "D",
              "text": "Çöplerin hangi günlerde toplandığını bildirmek"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Kullanılmış kâğıtlar geri dönüşüm sırasında nasıl hazırlanır?",
          "options": [
            {
              "key": "A",
              "text": "Yüksek sıcaklıkta eritilerek sıvı hâle getirilir."
            },
            {
              "key": "B",
              "text": "Sıkıştırılarak ince metal levhalara dönüştürülür."
            },
            {
              "key": "C",
              "text": "Suyla karıştırılarak kâğıt hamuru hâline getirilir."
            },
            {
              "key": "D",
              "text": "Küçük cam parçalarıyla bir araya getirilir."
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Metne göre kâğıt lifleri genellikle kaç kez geri dönüştürülebilir?",
          "options": [
            {
              "key": "A",
              "text": "5 ile 7 kez"
            },
            {
              "key": "B",
              "text": "8 ile 10 kez"
            },
            {
              "key": "C",
              "text": "12 ile 15 kez"
            },
            {
              "key": "D",
              "text": "20 ile 25 kez"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q4",
          "question": "İçinde yiyecek bulunan bir kap geri dönüşüm kutusuna atılırsa ne olabilir?",
          "options": [
            {
              "key": "A",
              "text": "Malzemelerin türlerine ayrılması kolaylaşabilir."
            },
            {
              "key": "B",
              "text": "Kâğıt lifleri daha uzun süre kullanılabilir."
            },
            {
              "key": "C",
              "text": "Atıkların temizlenmesine gerek kalmayabilir."
            },
            {
              "key": "D",
              "text": "Kutudaki diğer geri dönüştürülebilir atıklar kirlenebilir."
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q5",
          "question": "Metne göre atıkların doğru biçimde ayrılması neden önemlidir?",
          "options": [
            {
              "key": "A",
              "text": "Bütün malzemelerin aynı işlemden geçirilmesini sağlar."
            },
            {
              "key": "B",
              "text": "Kullanılabilecek malzemelerin yeni ürünlere dönüşmesine yardımcı olur."
            },
            {
              "key": "C",
              "text": "Yalnızca kâğıt atıkların çöpe gitmesini önler."
            },
            {
              "key": "D",
              "text": "Atıkların geri dönüşüm tesisine taşınmasını gereksiz kılar."
            }
          ],
          "correctAnswer": "B"
        }
      ]
    },
    {
      "id": "grade-3-text-08",
      "grade": "3",
      "number": 8,
      "title": "EKMEK SOFRAMIZA NASIL GELİR?",
      "paragraphs": [
        "Ekmek soframıza gelmeden önce uzun bir yolculuktan geçer. Bu yolculuk, çiftçinin buğday tohumlarını toprağa ekmesiyle başlar. Yağmur ve güneşin yardımıyla büyüyen buğdaylar olgunlaşınca biçerdöverlerle toplanır. Taneler saplarından ayrılır ve değirmene götürülür. Değirmende temizlenen buğday taneleri öğütülerek una dönüştürülür. Elde edilen un, nemden korunması için temiz ve kuru depolarda saklanır.",
        "Fırıncı, unu su, tuz ve mayayla karıştırır. Bu karışım iyice yoğrulduğunda yumuşak bir hamur oluşur. Maya, hamurun içinde küçük gaz kabarcıkları meydana getirir. Böylece hamur dinlenirken kabarır. Bazı üretim yöntemlerinde hamur, yoğrulduktan sonra yaklaşık 20 dakika dinlendirilir. Daha sonra eşit parçalara ayrılır, şekil verilir ve yeniden kabarması için bekletilir.",
        "Hazırlanan hamurlar sıcak fırına yerleştirilir. Pişme sırasında hamurun dışı kızarır, içi ise yumuşak bir yapıya kavuşur. Fırından çıkan ekmekler bir süre soğutulduktan sonra satışa gönderilir. Bu süreçte temizlik kurallarına uyulması çok önemlidir. Çünkü kullanılan araçların ve malzemelerin temiz olması, ekmeğin güvenli biçimde üretilmesini sağlar. Tarladan başlayan bu yolculuk, çiftçi, değirmenci ve fırıncının dikkatli çalışmasıyla soframızda tamamlanır. Bu nedenle ekmeği gereksiz yere çöpe atmamak, verilen emeğe saygı göstermektir."
      ],
      "content": "Ekmek soframıza gelmeden önce uzun bir yolculuktan geçer. Bu yolculuk, çiftçinin buğday tohumlarını toprağa ekmesiyle başlar. Yağmur ve güneşin yardımıyla büyüyen buğdaylar olgunlaşınca biçerdöverlerle toplanır. Taneler saplarından ayrılır ve değirmene götürülür. Değirmende temizlenen buğday taneleri öğütülerek una dönüştürülür. Elde edilen un, nemden korunması için temiz ve kuru depolarda saklanır.\n\nFırıncı, unu su, tuz ve mayayla karıştırır. Bu karışım iyice yoğrulduğunda yumuşak bir hamur oluşur. Maya, hamurun içinde küçük gaz kabarcıkları meydana getirir. Böylece hamur dinlenirken kabarır. Bazı üretim yöntemlerinde hamur, yoğrulduktan sonra yaklaşık 20 dakika dinlendirilir. Daha sonra eşit parçalara ayrılır, şekil verilir ve yeniden kabarması için bekletilir.\n\nHazırlanan hamurlar sıcak fırına yerleştirilir. Pişme sırasında hamurun dışı kızarır, içi ise yumuşak bir yapıya kavuşur. Fırından çıkan ekmekler bir süre soğutulduktan sonra satışa gönderilir. Bu süreçte temizlik kurallarına uyulması çok önemlidir. Çünkü kullanılan araçların ve malzemelerin temiz olması, ekmeğin güvenli biçimde üretilmesini sağlar. Tarladan başlayan bu yolculuk, çiftçi, değirmenci ve fırıncının dikkatli çalışmasıyla soframızda tamamlanır. Bu nedenle ekmeği gereksiz yere çöpe atmamak, verilen emeğe saygı göstermektir.",
      "wordCount": 165,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Farklı ekmek çeşitlerinin özelliklerini karşılaştırmak"
            },
            {
              "key": "B",
              "text": "Ekmeğin buğdaydan sofraya ulaşma sürecini açıklamak"
            },
            {
              "key": "C",
              "text": "Çiftçilerin kullandığı tarım araçlarını tanıtmak"
            },
            {
              "key": "D",
              "text": "Ekmeklerin satış fiyatlarının nasıl belirlendiğini anlatmak"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Un neden temiz ve kuru depolarda saklanır?",
          "options": [
            {
              "key": "A",
              "text": "Daha kısa sürede hamura dönüşmesi için"
            },
            {
              "key": "B",
              "text": "Buğday tanelerinden kolayca ayrılması için"
            },
            {
              "key": "C",
              "text": "Nemden korunarak uygun durumda kalması için"
            },
            {
              "key": "D",
              "text": "Fırına konulduğunda daha hızlı kızarması için"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Metne göre bazı üretim yöntemlerinde hamur yaklaşık kaç dakika dinlendirilir?",
          "options": [
            {
              "key": "A",
              "text": "15 dakika"
            },
            {
              "key": "B",
              "text": "20 dakika"
            },
            {
              "key": "C",
              "text": "25 dakika"
            },
            {
              "key": "D",
              "text": "30 dakika"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q4",
          "question": "Hamura maya eklenmeseydi aşağıdakilerden hangisinin gerçekleşmesi zorlaşırdı?",
          "options": [
            {
              "key": "A",
              "text": "Buğday tanelerinin değirmende öğütülmesi"
            },
            {
              "key": "B",
              "text": "Unun kuru depolarda korunması"
            },
            {
              "key": "C",
              "text": "Ekmeklerin satış yerine gönderilmesi"
            },
            {
              "key": "D",
              "text": "Hamurun dinlenirken kabarması"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q5",
          "question": "Metinden aşağıdakilerden hangisi çıkarılabilir?",
          "options": [
            {
              "key": "A",
              "text": "Ekmeğin sofraya ulaşması farklı kişilerin emeğini gerektirir."
            },
            {
              "key": "B",
              "text": "Ekmeğin hazırlanmasında en önemli görev yalnızca çiftçiye aittir."
            },
            {
              "key": "C",
              "text": "Buğdaylar toplandıktan sonra doğrudan fırında pişirilir."
            },
            {
              "key": "D",
              "text": "Ekmeğin yapımında temizlik yalnızca satış sırasında önemlidir."
            }
          ],
          "correctAnswer": "A"
        }
      ]
    },
    {
      "id": "grade-3-text-09",
      "grade": "3",
      "number": 9,
      "title": "GÖÇMEN KUŞLARIN UZUN YOLCULUĞU",
      "paragraphs": [
        "Göçmen kuşlar, mevsimler değiştiğinde daha uygun bölgelere doğru yolculuk eder. Bazıları soğuk havadan kaçmak, bazıları yiyecek bulmak, bazıları da yavrularını güvenli yerlerde büyütmek için göç eder. Yolculuk başlamadan önce daha çok beslenerek vücutlarında enerji depolarlar. Böylece uzun süre uçabilecek güce sahip olurlar.",
        "Kuşlar yollarını bulurken Güneş’in konumundan, yıldızlardan, dağlardan ve kıyılardan yararlanabilir. Bazı türler, Dünya’nın manyetik alanını da hissedebilir. Sürü hâlinde uçan kuşlar birbirlerini takip ederek yönlerini korur. Özellikle kazlar, havada “V” biçiminde ilerler. Öndeki kuş havayı yararken arkadakilerin daha az yorulmasına yardım eder. Öndeki kuş yorulduğunda başka bir kuş onun yerini alır.",
        "Göçmen kuşlardan kutup sumrusu, bir yıl içinde 50 bin kilometreden fazla yol alabilir. Bu küçük kuş, kuzey bölgelerinden Antarktika’ya doğru uçar ve daha sonra geri döner. Fırtınalar, kuvvetli rüzgârlar ve yiyecek azlığı yolculuğu zorlaştırabilir. Bazı kuşlar gündüz, bazıları ise gece göç eder. Uçuş zamanı türlere ve hava koşullarına göre değişir. Kuşların dinlenebileceği sulak alanların korunması bu yüzden önemlidir. Bu alanlar, uzun yolculuk sırasında kuşlara güvenli bir mola ve beslenme fırsatı sunar."
      ],
      "content": "Göçmen kuşlar, mevsimler değiştiğinde daha uygun bölgelere doğru yolculuk eder. Bazıları soğuk havadan kaçmak, bazıları yiyecek bulmak, bazıları da yavrularını güvenli yerlerde büyütmek için göç eder. Yolculuk başlamadan önce daha çok beslenerek vücutlarında enerji depolarlar. Böylece uzun süre uçabilecek güce sahip olurlar.\n\nKuşlar yollarını bulurken Güneş’in konumundan, yıldızlardan, dağlardan ve kıyılardan yararlanabilir. Bazı türler, Dünya’nın manyetik alanını da hissedebilir. Sürü hâlinde uçan kuşlar birbirlerini takip ederek yönlerini korur. Özellikle kazlar, havada “V” biçiminde ilerler. Öndeki kuş havayı yararken arkadakilerin daha az yorulmasına yardım eder. Öndeki kuş yorulduğunda başka bir kuş onun yerini alır.\n\nGöçmen kuşlardan kutup sumrusu, bir yıl içinde 50 bin kilometreden fazla yol alabilir. Bu küçük kuş, kuzey bölgelerinden Antarktika’ya doğru uçar ve daha sonra geri döner. Fırtınalar, kuvvetli rüzgârlar ve yiyecek azlığı yolculuğu zorlaştırabilir. Bazı kuşlar gündüz, bazıları ise gece göç eder. Uçuş zamanı türlere ve hava koşullarına göre değişir. Kuşların dinlenebileceği sulak alanların korunması bu yüzden önemlidir. Bu alanlar, uzun yolculuk sırasında kuşlara güvenli bir mola ve beslenme fırsatı sunar.",
      "wordCount": 164,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Kuşların farklı renk ve büyüklüklerini karşılaştırmak"
            },
            {
              "key": "B",
              "text": "Kuşların yuvalarını hangi malzemelerle yaptığını açıklamak"
            },
            {
              "key": "C",
              "text": "Göçmen kuşların yolculuklarını ve bu sıradaki davranışlarını anlatmak"
            },
            {
              "key": "D",
              "text": "Sulak alanlarda yaşayan bütün canlıları tanıtmak"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "Göçmen kuşlar yolculuk öncesinde neden daha çok beslenir?",
          "options": [
            {
              "key": "A",
              "text": "Uzun süre uçabilmek için enerji depolamak amacıyla"
            },
            {
              "key": "B",
              "text": "Uçuş sırasında yönlerini daha kolay bulmak amacıyla"
            },
            {
              "key": "C",
              "text": "Tüylerinin rengini değiştirmek amacıyla"
            },
            {
              "key": "D",
              "text": "Sürüdeki diğer kuşlardan ayrılmak amacıyla"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "Kutup sumrusu bir yıl içinde ne kadar yol alabilir?",
          "options": [
            {
              "key": "A",
              "text": "5 bin kilometreden fazla"
            },
            {
              "key": "B",
              "text": "15 bin kilometreden fazla"
            },
            {
              "key": "C",
              "text": "30 bin kilometreden fazla"
            },
            {
              "key": "D",
              "text": "50 bin kilometreden fazla"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q4",
          "question": "Öndeki kuş yorulduğunda başka bir kuşun onun yerini alması neyi göstermektedir?",
          "options": [
            {
              "key": "A",
              "text": "Kuşların sürekli farklı yönlere uçtuğunu"
            },
            {
              "key": "B",
              "text": "Sürüdeki kuşların görev paylaşımı yaptığını"
            },
            {
              "key": "C",
              "text": "Öndeki kuşun yolu bulamadığını"
            },
            {
              "key": "D",
              "text": "Bütün kuşların aynı anda dinlendiğini"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "Sulak alanların azalması göçmen kuşları nasıl etkileyebilir?",
          "options": [
            {
              "key": "A",
              "text": "Kuşların daha kısa sürede büyümesini sağlayabilir."
            },
            {
              "key": "B",
              "text": "Kuşların göç etme ihtiyacını ortadan kaldırabilir."
            },
            {
              "key": "C",
              "text": "Kuşların uçuş biçimlerini tamamen değiştirebilir."
            },
            {
              "key": "D",
              "text": "Dinlenme ve beslenme yeri bulmalarını zorlaştırabilir."
            }
          ],
          "correctAnswer": "D"
        }
      ]
    },
    {
      "id": "grade-3-text-10",
      "grade": "3",
      "number": 10,
      "title": "DENİZ KAPLUMBAĞALARININ DENİZE ULAŞMASI",
      "paragraphs": [
        "Deniz kaplumbağaları, yumurtlamak için genellikle doğdukları kıyılara geri döner. Dişi kaplumbağa gece saatlerinde kumsala çıkar, arka yüzgeçleriyle bir çukur açar ve yumurtalarını buraya bırakır. Daha sonra çukuru kumla kapatır ve yeniden denize döner. Yumurtalar sıcak kumun altında yaklaşık iki ay boyunca gelişir.",
        "Yavrular yumurtadan çıktıktan sonra birlikte hareket ederek kumun yüzeyine ulaşır. Genellikle gece ortaya çıkarlar. Deniz tarafındaki açık ufuk, kumsalın kara yönüne göre daha aydınlık göründüğü için yavrular bu yöne ilerler. Ancak otellerden, yollardan veya evlerden gelen güçlü ışıklar onları şaşırtabilir. Yanlış yöne giden yavrular yorulabilir ve denize ulaşmakta zorlanabilir. Kısa görünen bu yol, küçük yavrular için oldukça dikkat gerektiren zorlu bir yolculuktur.",
        "Kumsaldaki çukurlar, plastik atıklar ve bırakılan eşyalar da yavruların yolunu kapatabilir. Bu nedenle yuvalara dokunmamak, sahili temiz tutmak ve gece gereksiz ışıkları kapatmak önemlidir. İnsanlar uzaktan ve sessizce gözlem yaptığında yavrular doğal yollarıyla denize güvenli biçimde ulaşabilir. Denize varan her yavru için asıl yolculuk burada başlar; açık sularda büyür, beslenir ve yıllar sonra aynı kıyılara dönebilir."
      ],
      "content": "Deniz kaplumbağaları, yumurtlamak için genellikle doğdukları kıyılara geri döner. Dişi kaplumbağa gece saatlerinde kumsala çıkar, arka yüzgeçleriyle bir çukur açar ve yumurtalarını buraya bırakır. Daha sonra çukuru kumla kapatır ve yeniden denize döner. Yumurtalar sıcak kumun altında yaklaşık iki ay boyunca gelişir.\n\nYavrular yumurtadan çıktıktan sonra birlikte hareket ederek kumun yüzeyine ulaşır. Genellikle gece ortaya çıkarlar. Deniz tarafındaki açık ufuk, kumsalın kara yönüne göre daha aydınlık göründüğü için yavrular bu yöne ilerler. Ancak otellerden, yollardan veya evlerden gelen güçlü ışıklar onları şaşırtabilir. Yanlış yöne giden yavrular yorulabilir ve denize ulaşmakta zorlanabilir. Kısa görünen bu yol, küçük yavrular için oldukça dikkat gerektiren zorlu bir yolculuktur.\n\nKumsaldaki çukurlar, plastik atıklar ve bırakılan eşyalar da yavruların yolunu kapatabilir. Bu nedenle yuvalara dokunmamak, sahili temiz tutmak ve gece gereksiz ışıkları kapatmak önemlidir. İnsanlar uzaktan ve sessizce gözlem yaptığında yavrular doğal yollarıyla denize güvenli biçimde ulaşabilir. Denize varan her yavru için asıl yolculuk burada başlar; açık sularda büyür, beslenir ve yıllar sonra aynı kıyılara dönebilir.",
      "wordCount": 160,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Deniz kaplumbağalarının açık denizde nasıl beslendiğini anlatmak"
            },
            {
              "key": "B",
              "text": "Kumsallardaki farklı canlı türlerini tanıtmak"
            },
            {
              "key": "C",
              "text": "Kaplumbağa yavrularının denize ulaşma sürecini ve karşılaştıkları güçlükleri açıklamak"
            },
            {
              "key": "D",
              "text": "Deniz kıyısında yapılan turistik etkinlikleri tanıtmak"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "Yavru kaplumbağaların denizin yönünü bulmasına ne yardımcı olur?",
          "options": [
            {
              "key": "A",
              "text": "Deniz tarafındaki açık ufkun daha aydınlık görünmesi"
            },
            {
              "key": "B",
              "text": "Kumsalda bırakılan eşyaların oluşturduğu izler"
            },
            {
              "key": "C",
              "text": "Otellerden ve yollardan gelen güçlü ışıklar"
            },
            {
              "key": "D",
              "text": "Dişi kaplumbağanın yavruların yanında beklemesi"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "Kaplumbağa yumurtaları sıcak kumun altında yaklaşık ne kadar süre gelişir?",
          "options": [
            {
              "key": "A",
              "text": "İki hafta"
            },
            {
              "key": "B",
              "text": "Bir ay"
            },
            {
              "key": "C",
              "text": "İki ay"
            },
            {
              "key": "D",
              "text": "Dört ay"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q4",
          "question": "Kumsalın yakınındaki güçlü ışıklar gece boyunca açık kalırsa ne yaşanabilir?",
          "options": [
            {
              "key": "A",
              "text": "Yavrular kumun yüzeyine daha erken çıkabilir."
            },
            {
              "key": "B",
              "text": "Yumurtalar kumun altında daha hızlı gelişebilir."
            },
            {
              "key": "C",
              "text": "Yavrular denizin yönünü daha kolay bulabilir."
            },
            {
              "key": "D",
              "text": "Yavrular yanlış yöne giderek denize ulaşmakta zorlanabilir."
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q5",
          "question": "İnsanların yavru kaplumbağaları uzaktan ve sessizce izlemesi neden önemlidir?",
          "options": [
            {
              "key": "A",
              "text": "Yavruların yeniden yumurtalarının içine dönmesini sağlar."
            },
            {
              "key": "B",
              "text": "Kumsaldaki yapay ışıkların daha güçlü görünmesini sağlar."
            },
            {
              "key": "C",
              "text": "Yavruların doğal davranışlarıyla yollarına devam etmelerine yardımcı olur."
            },
            {
              "key": "D",
              "text": "Yavruların kumun üzerinde daha uzun süre kalmasını sağlar."
            }
          ],
          "correctAnswer": "C"
        }
      ]
    }
  ],
  "4": [
    {
      "id": "grade-4-text-01",
      "grade": "4",
      "number": 1,
      "title": "AĞAÇ HALKALARINDA SAKLI BİLGİLER",
      "paragraphs": [
        "Bir ağacın gövdesine dikkatlice bakıldığında iç içe geçmiş halkalar görülür. Bu halkalar yalnızca ağacın yaşını göstermez; geçmişte yaşanan hava olayları hakkında da bilgi verir. Ilıman bölgelerde yaşayan birçok ağaç, her yıl gövdesine yeni bir büyüme halkası ekler. Bu nedenle bilim insanları halkaları sayarak ağacın yaklaşık yaşını belirleyebilir.",
        "Halkaların genişliği her yıl aynı olmaz. Yağışın yeterli, sıcaklığın uygun olduğu yıllarda ağaç daha hızlı büyür ve geniş halkalar oluşturur. Kuraklık, aşırı soğuk veya hastalık görülen dönemlerde ise halkalar daha dar olabilir. Bazen bir yangın, ağacın gövdesinde koyu renkli bir iz bırakır. Bilim insanları bu izleri inceleyerek geçmişte bölgede yangın yaşanıp yaşanmadığını anlayabilir. Aynı bölgede yetişen farklı ağaçların halkaları karşılaştırıldığında ortak izler bulunabilir. Böylece yalnızca tek bir ağacın değil, bütün bölgenin geçmişi hakkında daha güvenilir sonuçlara ulaşılır.",
        "Ağacın yaşını öğrenmek için her zaman kesilmesi gerekmez. Uzmanlar, özel bir araçla gövdeden kalem inceliğinde bir örnek çıkarabilir. Bu işlem doğru uygulandığında ağacın yaşamını sürdürmesine engel olmaz. Dünyanın en uzun ömürlü ağaçları arasında bulunan bazı uzun ömürlü çamlar 5.000 yıldan fazla yaşayabilir. Bu ağaçların halkaları, çok eski dönemlerin iklimi hakkında önemli bilgiler taşır. Böylece ağaçlar, geçmişten günümüze ulaşan sessiz birer kayıt defteri gibi görev yapar."
      ],
      "content": "Bir ağacın gövdesine dikkatlice bakıldığında iç içe geçmiş halkalar görülür. Bu halkalar yalnızca ağacın yaşını göstermez; geçmişte yaşanan hava olayları hakkında da bilgi verir. Ilıman bölgelerde yaşayan birçok ağaç, her yıl gövdesine yeni bir büyüme halkası ekler. Bu nedenle bilim insanları halkaları sayarak ağacın yaklaşık yaşını belirleyebilir.\n\nHalkaların genişliği her yıl aynı olmaz. Yağışın yeterli, sıcaklığın uygun olduğu yıllarda ağaç daha hızlı büyür ve geniş halkalar oluşturur. Kuraklık, aşırı soğuk veya hastalık görülen dönemlerde ise halkalar daha dar olabilir. Bazen bir yangın, ağacın gövdesinde koyu renkli bir iz bırakır. Bilim insanları bu izleri inceleyerek geçmişte bölgede yangın yaşanıp yaşanmadığını anlayabilir. Aynı bölgede yetişen farklı ağaçların halkaları karşılaştırıldığında ortak izler bulunabilir. Böylece yalnızca tek bir ağacın değil, bütün bölgenin geçmişi hakkında daha güvenilir sonuçlara ulaşılır.\n\nAğacın yaşını öğrenmek için her zaman kesilmesi gerekmez. Uzmanlar, özel bir araçla gövdeden kalem inceliğinde bir örnek çıkarabilir. Bu işlem doğru uygulandığında ağacın yaşamını sürdürmesine engel olmaz. Dünyanın en uzun ömürlü ağaçları arasında bulunan bazı uzun ömürlü çamlar 5.000 yıldan fazla yaşayabilir. Bu ağaçların halkaları, çok eski dönemlerin iklimi hakkında önemli bilgiler taşır. Böylece ağaçlar, geçmişten günümüze ulaşan sessiz birer kayıt defteri gibi görev yapar.",
      "wordCount": 190,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Ağaçların hangi mevsimde dikilmesi gerektiğini açıklamak"
            },
            {
              "key": "B",
              "text": "Farklı ağaç türlerinin yapraklarını karşılaştırmak"
            },
            {
              "key": "C",
              "text": "Ağaç halkalarının hangi bilgileri taşıdığını anlatmak"
            },
            {
              "key": "D",
              "text": "Orman yangınlarının nasıl söndürüldüğünü göstermek"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "Bazı yıllarda ağaç halkalarının daha dar olmasının nedeni ne olabilir?",
          "options": [
            {
              "key": "A",
              "text": "Kuraklık, aşırı soğuk veya hastalık yaşanması"
            },
            {
              "key": "B",
              "text": "Ağacın her yıl farklı bir yerde yetişmesi"
            },
            {
              "key": "C",
              "text": "Gövdenin dış bölümünün sürekli temizlenmesi"
            },
            {
              "key": "D",
              "text": "Ağacın yapraklarının daha koyu renkte olması"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "Metne göre bazı uzun ömürlü çamlar kaç yıldan fazla yaşayabilir?",
          "options": [
            {
              "key": "A",
              "text": "500 yıl"
            },
            {
              "key": "B",
              "text": "1.000 yıl"
            },
            {
              "key": "C",
              "text": "2.500 yıl"
            },
            {
              "key": "D",
              "text": "5.000 yıl"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q4",
          "question": "Bilim insanlarının aynı bölgedeki farklı ağaçların halkalarını karşılaştırması ne sağlar?",
          "options": [
            {
              "key": "A",
              "text": "Ağaçların daha hızlı büyümesini sağlar."
            },
            {
              "key": "B",
              "text": "Bölgenin geçmişi hakkında daha güvenilir bilgi verir."
            },
            {
              "key": "C",
              "text": "Bütün ağaçların aynı yaşta olduğunu gösterir."
            },
            {
              "key": "D",
              "text": "Ağaçların hastalıklardan korunmasına yardımcı olur."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "Metinde ağaçların “sessiz birer kayıt defteri” olarak tanımlanmasının nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Gövdelerinde insanların yazdığı bilgiler bulunması"
            },
            {
              "key": "B",
              "text": "Ormanda uzun süre hareketsiz biçimde yaşamaları"
            },
            {
              "key": "C",
              "text": "Geçmişteki iklim ve doğa olaylarının izlerini taşımaları"
            },
            {
              "key": "D",
              "text": "Yalnızca yaşlı ağaçların halka oluşturabilmesi"
            }
          ],
          "correctAnswer": "C"
        }
      ]
    },
    {
      "id": "grade-4-text-02",
      "grade": "4",
      "number": 2,
      "title": "KANIN VÜCUDUMUZDAKİ YOLCULUĞU",
      "paragraphs": [
        "Vücudumuzdaki kan, kalbin pompalamasıyla damarlar içinde sürekli hareket eder. Kalp, göğsümüzün ortasına yakın bir yerde bulunan güçlü bir kastır. Kasılıp gevşedikçe kanı vücudun farklı bölgelerine gönderir. Kanın bu düzenli hareketine dolaşım denir. Dolaşım sayesinde hücreler, yaşamlarını sürdürebilmek için gerekli maddelere ulaşır.",
        "Kalbin sol bölümünden çıkan oksijen bakımından zengin kan, atardamarlar aracılığıyla organlara ve dokulara taşınır. Bu kan, hücrelerin ihtiyaç duyduğu oksijen ile besinleri götürür. Hücreler bu maddeleri kullandıktan sonra oluşan karbondioksit ve bazı atıklar kana geçer. Toplardamarlar, oksijeni azalmış kanı yeniden kalbe getirir. Kalp bu kanı akciğerlere gönderir. Akciğerlerde karbondioksit dışarı verilir, soluduğumuz havadaki oksijen ise kana alınır. Oksijen bakımından zenginleşen kan tekrar kalbe döner ve yeni bir yolculuğa çıkar.",
        "Yetişkin bir insanın vücudunda ortalama 5 litreye yakın kan bulunur. Çocuklarda ise bu miktar yaşa ve vücut büyüklüğüne göre daha azdır. Kan yalnızca oksijen taşımaz; vücut sıcaklığının dengelenmesine, mikroplarla mücadeleye ve yaraların kapanmasına da yardım eder. Kanın bazı hücreleri mikroplara karşı savunma yaparken küçük parçacıkları kanamanın durmasına katkı sağlar. Kalp, akciğerler, damarlar ve kanın uyum içinde çalışması, bütün organların görevlerini sürdürebilmesi için gereklidir. Bu sistem, biz uyurken bile çalışmaya ara vermeden devam eder."
      ],
      "content": "Vücudumuzdaki kan, kalbin pompalamasıyla damarlar içinde sürekli hareket eder. Kalp, göğsümüzün ortasına yakın bir yerde bulunan güçlü bir kastır. Kasılıp gevşedikçe kanı vücudun farklı bölgelerine gönderir. Kanın bu düzenli hareketine dolaşım denir. Dolaşım sayesinde hücreler, yaşamlarını sürdürebilmek için gerekli maddelere ulaşır.\n\nKalbin sol bölümünden çıkan oksijen bakımından zengin kan, atardamarlar aracılığıyla organlara ve dokulara taşınır. Bu kan, hücrelerin ihtiyaç duyduğu oksijen ile besinleri götürür. Hücreler bu maddeleri kullandıktan sonra oluşan karbondioksit ve bazı atıklar kana geçer. Toplardamarlar, oksijeni azalmış kanı yeniden kalbe getirir. Kalp bu kanı akciğerlere gönderir. Akciğerlerde karbondioksit dışarı verilir, soluduğumuz havadaki oksijen ise kana alınır. Oksijen bakımından zenginleşen kan tekrar kalbe döner ve yeni bir yolculuğa çıkar.\n\nYetişkin bir insanın vücudunda ortalama 5 litreye yakın kan bulunur. Çocuklarda ise bu miktar yaşa ve vücut büyüklüğüne göre daha azdır. Kan yalnızca oksijen taşımaz; vücut sıcaklığının dengelenmesine, mikroplarla mücadeleye ve yaraların kapanmasına da yardım eder. Kanın bazı hücreleri mikroplara karşı savunma yaparken küçük parçacıkları kanamanın durmasına katkı sağlar. Kalp, akciğerler, damarlar ve kanın uyum içinde çalışması, bütün organların görevlerini sürdürebilmesi için gereklidir. Bu sistem, biz uyurken bile çalışmaya ara vermeden devam eder.",
      "wordCount": 183,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "İnsanların neden farklı kan gruplarına sahip olduğunu açıklamak"
            },
            {
              "key": "B",
              "text": "Kanın vücuttaki dolaşımını ve üstlendiği görevleri anlatmak"
            },
            {
              "key": "C",
              "text": "Kalp hastalıklarından korunmanın yollarını sıralamak"
            },
            {
              "key": "D",
              "text": "İnsan vücudundaki bütün organları tanıtmak"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Kandaki karbondioksit vücuttan hangi organda uzaklaştırılır?",
          "options": [
            {
              "key": "A",
              "text": "Midede"
            },
            {
              "key": "B",
              "text": "Böbreklerde"
            },
            {
              "key": "C",
              "text": "Kalpte"
            },
            {
              "key": "D",
              "text": "Akciğerlerde"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q3",
          "question": "Yetişkin bir insanın vücudunda ortalama ne kadar kan bulunur?",
          "options": [
            {
              "key": "A",
              "text": "5 litreye yakın"
            },
            {
              "key": "B",
              "text": "2 litreye yakın"
            },
            {
              "key": "C",
              "text": "8 litreye yakın"
            },
            {
              "key": "D",
              "text": "10 litreye yakın"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q4",
          "question": "Kalp, kanı yeterince güçlü biçimde pompalayamasaydı aşağıdakilerden hangisi yaşanabilirdi?",
          "options": [
            {
              "key": "A",
              "text": "Akciğerler havadaki bütün gazları kana alabilirdi."
            },
            {
              "key": "B",
              "text": "Vücuttaki kan miktarı kendiliğinden artabilirdi."
            },
            {
              "key": "C",
              "text": "Hücreler oksijen ve besinlere ulaşmakta zorlanabilirdi."
            },
            {
              "key": "D",
              "text": "Toplardamarların görev yapmasına gerek kalmayabilirdi."
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q5",
          "question": "Kalp, akciğerler, damarlar ve kanın bir sistem oluşturmasının nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Vücutta yalnızca uyku sırasında çalışmaları"
            },
            {
              "key": "B",
              "text": "Kan dolaşımını sağlamak için birbirine bağlı görevler yapmaları"
            },
            {
              "key": "C",
              "text": "Vücudun yalnızca sıcaklığını düzenlemeleri"
            },
            {
              "key": "D",
              "text": "Hepsinin aynı yapıya ve göreve sahip olması"
            }
          ],
          "correctAnswer": "B"
        }
      ]
    },
    {
      "id": "grade-4-text-03",
      "grade": "4",
      "number": 3,
      "title": "GÜNEŞ PANELLERİ NASIL ELEKTRİK ÜRETİR?",
      "paragraphs": [
        "Güneş panelleri, Güneş’ten gelen ışığı elektrik enerjisine dönüştüren araçlardır. Panellerin üzerinde çok sayıda güneş hücresi bulunur. Bu hücreler genellikle silisyum adı verilen bir maddeden üretilir. Güneş ışığı hücrelerin üzerine düştüğünde, hücrelerin içindeki çok küçük parçacıklar hareket etmeye başlar. Bu hareket, elektrik akımının oluşmasını sağlar.",
        "Panellerin ürettiği elektrik ilk anda evlerde kullanılan elektrikle aynı özellikte değildir. Bu nedenle sistemde “inverter” adı verilen bir cihaz bulunur. İnverter, panellerden gelen elektriği evlerdeki lambaların, buzdolaplarının ve diğer cihazların kullanabileceği duruma getirir. Üretilen elektrik hemen kullanılabilir, bataryalarda depolanabilir veya elektrik şebekesine aktarılabilir.",
        "Güneş ışığının Dünya’ya ulaşması yaklaşık 8 dakika 20 saniye sürer. Ancak panellerin verimli çalışması için yalnızca ışığın gelmesi yeterli değildir. Panellerin gölgede kalmaması, uygun yöne bakması ve yüzeylerinin temiz olması gerekir. Toz, yaprak veya kar tabakası ışığın hücrelere ulaşmasını azaltabilir.",
        "Güneş panelleri çalışırken duman çıkarmaz ve yakıt yakmaz. Bu nedenle elektrik üretirken hava kirliliğinin azalmasına katkı sağlayabilir. Yine de gece saatlerinde ışık olmadığı için elektrik üretimi durur. Bulutlu havalarda ise tamamen durmasa da azalabilir. Bu yüzden güneş enerjisi sistemleri kurulurken bölgenin güneşlenme süresi, çatı yönü ve enerji ihtiyacı dikkatle değerlendirilir. Birden fazla panel yan yana bağlandığında daha fazla elektrik üretebilen bir sistem oluşur."
      ],
      "content": "Güneş panelleri, Güneş’ten gelen ışığı elektrik enerjisine dönüştüren araçlardır. Panellerin üzerinde çok sayıda güneş hücresi bulunur. Bu hücreler genellikle silisyum adı verilen bir maddeden üretilir. Güneş ışığı hücrelerin üzerine düştüğünde, hücrelerin içindeki çok küçük parçacıklar hareket etmeye başlar. Bu hareket, elektrik akımının oluşmasını sağlar.\n\nPanellerin ürettiği elektrik ilk anda evlerde kullanılan elektrikle aynı özellikte değildir. Bu nedenle sistemde “inverter” adı verilen bir cihaz bulunur. İnverter, panellerden gelen elektriği evlerdeki lambaların, buzdolaplarının ve diğer cihazların kullanabileceği duruma getirir. Üretilen elektrik hemen kullanılabilir, bataryalarda depolanabilir veya elektrik şebekesine aktarılabilir.\n\nGüneş ışığının Dünya’ya ulaşması yaklaşık 8 dakika 20 saniye sürer. Ancak panellerin verimli çalışması için yalnızca ışığın gelmesi yeterli değildir. Panellerin gölgede kalmaması, uygun yöne bakması ve yüzeylerinin temiz olması gerekir. Toz, yaprak veya kar tabakası ışığın hücrelere ulaşmasını azaltabilir.\n\nGüneş panelleri çalışırken duman çıkarmaz ve yakıt yakmaz. Bu nedenle elektrik üretirken hava kirliliğinin azalmasına katkı sağlayabilir. Yine de gece saatlerinde ışık olmadığı için elektrik üretimi durur. Bulutlu havalarda ise tamamen durmasa da azalabilir. Bu yüzden güneş enerjisi sistemleri kurulurken bölgenin güneşlenme süresi, çatı yönü ve enerji ihtiyacı dikkatle değerlendirilir. Birden fazla panel yan yana bağlandığında daha fazla elektrik üretebilen bir sistem oluşur.",
      "wordCount": 190,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Evlerde kullanılan elektrikli araçları tanıtmak"
            },
            {
              "key": "B",
              "text": "Güneş’in Dünya üzerindeki etkilerini sıralamak"
            },
            {
              "key": "C",
              "text": "Güneş panellerinin elektrik üretme sürecini açıklamak"
            },
            {
              "key": "D",
              "text": "Elektrik faturalarının nasıl hesaplandığını anlatmak"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "İnverterin güneş enerjisi sistemindeki görevi nedir?",
          "options": [
            {
              "key": "A",
              "text": "Panellerden gelen elektriği evlerde kullanılabilir duruma getirmek"
            },
            {
              "key": "B",
              "text": "Güneş ışığının Dünya’ya ulaşma süresini kısaltmak"
            },
            {
              "key": "C",
              "text": "Panellerin üzerindeki tozları kendiliğinden temizlemek"
            },
            {
              "key": "D",
              "text": "Elektrik üretilirken panellerin ısınmasını engellemek"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "Güneş ışığının Dünya’ya ulaşması yaklaşık ne kadar sürer?",
          "options": [
            {
              "key": "A",
              "text": "4 dakika 10 saniye"
            },
            {
              "key": "B",
              "text": "6 dakika 30 saniye"
            },
            {
              "key": "C",
              "text": "10 dakika 20 saniye"
            },
            {
              "key": "D",
              "text": "8 dakika 20 saniye"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q4",
          "question": "Bir güneş panelinin üzeri yapraklarla kaplanırsa ne yaşanabilir?",
          "options": [
            {
              "key": "A",
              "text": "İnverterin görev yapmasına gerek kalmayabilir."
            },
            {
              "key": "B",
              "text": "Hücrelere ulaşan ışık azaldığı için elektrik üretimi düşebilir."
            },
            {
              "key": "C",
              "text": "Panel gece saatlerinde de elektrik üretmeye başlayabilir."
            },
            {
              "key": "D",
              "text": "Güneş ışığı Dünya’ya daha geç ulaşabilir."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "Metne göre güneş enerjisi sistemi kurulmadan önce bölgenin özelliklerinin incelenmesi neden önemlidir?",
          "options": [
            {
              "key": "A",
              "text": "Bütün çatılarda aynı sayıda panel kullanılmasını sağlamak için"
            },
            {
              "key": "B",
              "text": "Panellerin yalnızca bulutlu günlerde çalışmasını sağlamak için"
            },
            {
              "key": "C",
              "text": "Sistemden elde edilecek elektriğin ihtiyaca uygun olmasını sağlamak için"
            },
            {
              "key": "D",
              "text": "Elektrikli cihazların daha az enerji kullanmasını sağlamak için"
            }
          ],
          "correctAnswer": "C"
        }
      ]
    },
    {
      "id": "grade-4-text-04",
      "grade": "4",
      "number": 4,
      "title": "PUSULA YÖNÜMÜZÜ NASIL BULUR?",
      "paragraphs": [
        "Pusula, yönümüzü bulmamıza yardım eden basit ama çok önemli bir araçtır. İçinde serbestçe dönebilen mıknatıslanmış bir iğne bulunur. Dünya da büyük bir mıknatıs gibi davranır ve çevresinde görünmeyen bir manyetik alan oluşturur. Pusula iğnesi bu alandan etkilenerek kuzey-güney doğrultusunda durur. İğnenin renkli ya da işaretli ucu genellikle kuzeyi gösterir.",
        "Pusulanın üzerindeki kadranda kuzey, güney, doğu ve batı olmak üzere dört ana yön bulunur. Ayrıca kuzeydoğu, kuzeybatı, güneydoğu ve güneybatı gibi ara yönler de gösterilebilir. Tam bir daire 360 dereceye ayrılır. Kuzey 0 ya da 360 derece, doğu 90 derece, güney 180 derece ve batı 270 derece olarak kabul edilir.",
        "Pusulanın doğru çalışması için metal eşyalardan, güçlü mıknatıslardan ve elektrikli cihazlardan uzak tutulması gerekir. Çünkü bu nesneler iğnenin yönünü şaşırtabilir. Ayrıca pusula düz bir yüzeyde tutulmalı ve iğnenin durması beklenmelidir.",
        "Pusula yalnızca doğada yürüyüş yapanlar için değil, denizciler, pilotlar ve harita kullanan kişiler için de önemlidir. Ancak pusula tek başına yeterli değildir. Kullanıcı, haritadaki yön işaretlerini de bilmeli ve bulunduğu yeri doğru belirlemelidir. Pusula ile harita birlikte kullanıldığında gidilecek yön daha güvenli ve doğru biçimde bulunabilir. Bu nedenle pusulayı kullanmayı öğrenmek, özellikle bilinmeyen bir bölgede kaybolma riskini azaltır."
      ],
      "content": "Pusula, yönümüzü bulmamıza yardım eden basit ama çok önemli bir araçtır. İçinde serbestçe dönebilen mıknatıslanmış bir iğne bulunur. Dünya da büyük bir mıknatıs gibi davranır ve çevresinde görünmeyen bir manyetik alan oluşturur. Pusula iğnesi bu alandan etkilenerek kuzey-güney doğrultusunda durur. İğnenin renkli ya da işaretli ucu genellikle kuzeyi gösterir.\n\nPusulanın üzerindeki kadranda kuzey, güney, doğu ve batı olmak üzere dört ana yön bulunur. Ayrıca kuzeydoğu, kuzeybatı, güneydoğu ve güneybatı gibi ara yönler de gösterilebilir. Tam bir daire 360 dereceye ayrılır. Kuzey 0 ya da 360 derece, doğu 90 derece, güney 180 derece ve batı 270 derece olarak kabul edilir.\n\nPusulanın doğru çalışması için metal eşyalardan, güçlü mıknatıslardan ve elektrikli cihazlardan uzak tutulması gerekir. Çünkü bu nesneler iğnenin yönünü şaşırtabilir. Ayrıca pusula düz bir yüzeyde tutulmalı ve iğnenin durması beklenmelidir.\n\nPusula yalnızca doğada yürüyüş yapanlar için değil, denizciler, pilotlar ve harita kullanan kişiler için de önemlidir. Ancak pusula tek başına yeterli değildir. Kullanıcı, haritadaki yön işaretlerini de bilmeli ve bulunduğu yeri doğru belirlemelidir. Pusula ile harita birlikte kullanıldığında gidilecek yön daha güvenli ve doğru biçimde bulunabilir. Bu nedenle pusulayı kullanmayı öğrenmek, özellikle bilinmeyen bir bölgede kaybolma riskini azaltır.",
      "wordCount": 187,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Haritaların hangi malzemelerden üretildiğini açıklamak"
            },
            {
              "key": "B",
              "text": "Pusulanın yön bulmaya nasıl yardımcı olduğunu anlatmak"
            },
            {
              "key": "C",
              "text": "Denizcilerin yolculuk sırasında yaşadıkları sorunları sıralamak"
            },
            {
              "key": "D",
              "text": "Dünya’nın farklı bölgelerindeki iklimleri karşılaştırmak"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Pusula iğnesinin işaretli ucu genellikle hangi yönü gösterir?",
          "options": [
            {
              "key": "A",
              "text": "Kuzeyi"
            },
            {
              "key": "B",
              "text": "Güneyi"
            },
            {
              "key": "C",
              "text": "Doğuyu"
            },
            {
              "key": "D",
              "text": "Batıyı"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "Metne göre tam bir daire kaç dereceye ayrılır?",
          "options": [
            {
              "key": "A",
              "text": "90 derece"
            },
            {
              "key": "B",
              "text": "180 derece"
            },
            {
              "key": "C",
              "text": "270 derece"
            },
            {
              "key": "D",
              "text": "360 derece"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q4",
          "question": "Pusula güçlü bir mıknatısın yakınında kullanılırsa ne yaşanabilir?",
          "options": [
            {
              "key": "A",
              "text": "Kadrandaki yönlerin yerleri değişebilir."
            },
            {
              "key": "B",
              "text": "Dünya’nın manyetik alanı tamamen kaybolabilir."
            },
            {
              "key": "C",
              "text": "Pusula iğnesi etkilenerek yanlış yönü gösterebilir."
            },
            {
              "key": "D",
              "text": "Haritadaki yön işaretleri görünmez hâle gelebilir."
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q5",
          "question": "Pusula ile haritanın birlikte kullanılması neden daha güvenilir bir sonuç verir?",
          "options": [
            {
              "key": "A",
              "text": "Pusula, haritadaki bütün yolları kendiliğinden gösterdiği için"
            },
            {
              "key": "B",
              "text": "Yön ile bulunulan yerin birlikte değerlendirilmesini sağladığı için"
            },
            {
              "key": "C",
              "text": "Harita, pusula iğnesinin daha hızlı dönmesini sağladığı için"
            },
            {
              "key": "D",
              "text": "İki araç da yalnızca kuzey yönünü gösterdiği için"
            }
          ],
          "correctAnswer": "B"
        }
      ]
    },
    {
      "id": "grade-4-text-05",
      "grade": "4",
      "number": 5,
      "title": "VOLKANLAR NASIL OLUŞUR?",
      "paragraphs": [
        "Dünya’nın dış kısmı tek parça hâlinde değildir. Yerkabuğu, levha adı verilen büyük parçalardan oluşur. Bu levhalar çok yavaş hareket eder. Bazı yerlerde birbirine yaklaşır, bazı yerlerde uzaklaşır, bazı yerlerde ise yan yana kayar. Levhaların hareket ettiği bölgelerde, yerin derinliklerinde bulunan sıcak ve erimiş kayaçlar yukarı doğru çıkabilir.",
        "Yer altında bulunan bu erimiş kayaçlara magma denir. Magma, yerkabuğundaki çatlaklardan yukarı yükselir ve bazen yeryüzüne ulaşır. Yeryüzüne çıkan magmaya ise lav adı verilir. Lavla birlikte sıcak gazlar, kül ve küçük kaya parçaları da dışarı çıkabilir. Bu olaya volkanik patlama denir. Patlamalar her zaman aynı güçte olmaz. Bazı volkanlar yavaşça lav akıtırken bazıları daha şiddetli biçimde patlayabilir.",
        "Dünya’da yaklaşık 1.350 etkin ya da yeniden etkinleşme ihtimali bulunan volkan olduğu kabul edilir. Bunların büyük bölümü levha sınırlarına yakın alanlarda yer alır. Özellikle Büyük Okyanus çevresinde çok sayıda volkan bulunur. Bu bölgeye Ateş Çemberi adı verilir.",
        "Volkanik patlamalar çevrede yaşayan canlılar için tehlikeli olabilir. Ancak zamanla parçalanan volkanik kayaçlar, toprağı mineral bakımından zenginleştirebilir. Bu nedenle bazı volkanların çevresinde tarıma elverişli topraklar oluşur. Bilim insanları sarsıntıları, çıkan gazları ve sıcaklık değişimlerini izleyerek olası patlamaları tahmin etmeye çalışır. Bu gözlemler, insanların zamanında uyarılması ve güvenli bölgelere yönlendirilmesi açısından büyük önem taşır."
      ],
      "content": "Dünya’nın dış kısmı tek parça hâlinde değildir. Yerkabuğu, levha adı verilen büyük parçalardan oluşur. Bu levhalar çok yavaş hareket eder. Bazı yerlerde birbirine yaklaşır, bazı yerlerde uzaklaşır, bazı yerlerde ise yan yana kayar. Levhaların hareket ettiği bölgelerde, yerin derinliklerinde bulunan sıcak ve erimiş kayaçlar yukarı doğru çıkabilir.\n\nYer altında bulunan bu erimiş kayaçlara magma denir. Magma, yerkabuğundaki çatlaklardan yukarı yükselir ve bazen yeryüzüne ulaşır. Yeryüzüne çıkan magmaya ise lav adı verilir. Lavla birlikte sıcak gazlar, kül ve küçük kaya parçaları da dışarı çıkabilir. Bu olaya volkanik patlama denir. Patlamalar her zaman aynı güçte olmaz. Bazı volkanlar yavaşça lav akıtırken bazıları daha şiddetli biçimde patlayabilir.\n\nDünya’da yaklaşık 1.350 etkin ya da yeniden etkinleşme ihtimali bulunan volkan olduğu kabul edilir. Bunların büyük bölümü levha sınırlarına yakın alanlarda yer alır. Özellikle Büyük Okyanus çevresinde çok sayıda volkan bulunur. Bu bölgeye Ateş Çemberi adı verilir.\n\nVolkanik patlamalar çevrede yaşayan canlılar için tehlikeli olabilir. Ancak zamanla parçalanan volkanik kayaçlar, toprağı mineral bakımından zenginleştirebilir. Bu nedenle bazı volkanların çevresinde tarıma elverişli topraklar oluşur. Bilim insanları sarsıntıları, çıkan gazları ve sıcaklık değişimlerini izleyerek olası patlamaları tahmin etmeye çalışır. Bu gözlemler, insanların zamanında uyarılması ve güvenli bölgelere yönlendirilmesi açısından büyük önem taşır.",
      "wordCount": 195,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Yerkabuğundaki bütün kaya türlerini tanıtmak"
            },
            {
              "key": "B",
              "text": "Volkanların oluşumunu ve çevreye etkilerini açıklamak"
            },
            {
              "key": "C",
              "text": "Büyük Okyanus’ta yaşayan canlıları karşılaştırmak"
            },
            {
              "key": "D",
              "text": "Tarım yapılan bölgelerin özelliklerini sıralamak"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Yer altındaki magma yeryüzüne ulaştığında hangi adı alır?",
          "options": [
            {
              "key": "A",
              "text": "Lav"
            },
            {
              "key": "B",
              "text": "Kül"
            },
            {
              "key": "C",
              "text": "Mineral"
            },
            {
              "key": "D",
              "text": "Levha"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "Dünya’da yaklaşık kaç etkin ya da yeniden etkinleşme ihtimali bulunan volkan vardır?",
          "options": [
            {
              "key": "A",
              "text": "350"
            },
            {
              "key": "B",
              "text": "750"
            },
            {
              "key": "C",
              "text": "1.350"
            },
            {
              "key": "D",
              "text": "3.500"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q4",
          "question": "Volkanların büyük bölümünün levha sınırlarında bulunmasının nedeni aşağıdakilerden hangisi olabilir?",
          "options": [
            {
              "key": "A",
              "text": "Bu bölgelerde yeryüzünün her zaman daha soğuk olması"
            },
            {
              "key": "B",
              "text": "Levha hareketlerinin magmanın yukarı çıkabileceği alanlar oluşturması"
            },
            {
              "key": "C",
              "text": "Volkanların yalnızca deniz kıyılarında oluşabilmesi"
            },
            {
              "key": "D",
              "text": "Büyük Okyanus’un diğer okyanuslardan daha derin olması"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "Metne göre volkanların çevre üzerinde hem olumsuz hem de olumlu etkileri olabileceğini gösteren seçenek hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Patlamaların tehlike oluşturması, volkanik kayaçların ise toprağı zenginleştirmesi"
            },
            {
              "key": "B",
              "text": "Levhaların yavaş hareket etmesi, magmanın yer altında bulunması"
            },
            {
              "key": "C",
              "text": "Bazı volkanların lav akıtması, bazılarının uzun süre sessiz kalması"
            },
            {
              "key": "D",
              "text": "Bilim insanlarının sarsıntıları izlemesi, insanların güvenli bölgelere gitmesi"
            }
          ],
          "correctAnswer": "A"
        }
      ]
    },
    {
      "id": "grade-4-text-06",
      "grade": "4",
      "number": 6,
      "title": "İPEK BÖCEĞİNİN YAŞAM DÖNGÜSÜ",
      "paragraphs": [
        "İpek böceği, yaşamına çok küçük bir yumurtanın içinde başlar. Uygun sıcaklık ve nem oluştuğunda yumurtadan tırtıla benzeyen bir larva çıkar. Bu larva, gelişebilmek için özellikle dut ağacının yapraklarıyla beslenir. İlk günlerde oldukça küçük olan ipek böceği, düzenli beslendikçe hızla büyür.",
        "Büyüyen larvanın dışındaki deri bir süre sonra vücuduna dar gelmeye başlar. Bu nedenle gelişimi boyunca dört kez deri değiştirir. Her deri değişiminden sonra biraz daha büyür ve daha fazla yaprak tüketir. Yeterince geliştiğinde yemeyi bırakır ve başını düzenli hareketlerle çevirerek ince bir iplik üretmeye başlar. Bu ipliği çevresine sararak koza adı verilen koruyucu bir yapı oluşturur.",
        "İpek böceği kozanın içinde pupa hâline gelir. Dışarıdan hareketsiz görünse de vücudunda büyük değişiklikler gerçekleşir. Bir süre sonra yetişkin bir ipek güvesine dönüşür. Güve kozadan çıktığında eş bulur ve dişi güve yeni yumurtalar bırakır. Böylece yaşam döngüsü yeniden başlar.",
        "İpek üretiminde kullanılan uzun ve ince iplik, kozanın yapısından elde edilir. Ancak her kozanın dikkatle toplanması ve uygun şekilde işlenmesi gerekir. İpek böceğinin yumurtadan güveye uzanan yolculuğu; yumurta, larva, pupa ve yetişkin olmak üzere dört temel aşamadan oluşur. Bu değişim, doğadaki canlıların yaşamları boyunca ne kadar farklı görünümlere sahip olabileceğini gösterir."
      ],
      "content": "İpek böceği, yaşamına çok küçük bir yumurtanın içinde başlar. Uygun sıcaklık ve nem oluştuğunda yumurtadan tırtıla benzeyen bir larva çıkar. Bu larva, gelişebilmek için özellikle dut ağacının yapraklarıyla beslenir. İlk günlerde oldukça küçük olan ipek böceği, düzenli beslendikçe hızla büyür.\n\nBüyüyen larvanın dışındaki deri bir süre sonra vücuduna dar gelmeye başlar. Bu nedenle gelişimi boyunca dört kez deri değiştirir. Her deri değişiminden sonra biraz daha büyür ve daha fazla yaprak tüketir. Yeterince geliştiğinde yemeyi bırakır ve başını düzenli hareketlerle çevirerek ince bir iplik üretmeye başlar. Bu ipliği çevresine sararak koza adı verilen koruyucu bir yapı oluşturur.\n\nİpek böceği kozanın içinde pupa hâline gelir. Dışarıdan hareketsiz görünse de vücudunda büyük değişiklikler gerçekleşir. Bir süre sonra yetişkin bir ipek güvesine dönüşür. Güve kozadan çıktığında eş bulur ve dişi güve yeni yumurtalar bırakır. Böylece yaşam döngüsü yeniden başlar.\n\nİpek üretiminde kullanılan uzun ve ince iplik, kozanın yapısından elde edilir. Ancak her kozanın dikkatle toplanması ve uygun şekilde işlenmesi gerekir. İpek böceğinin yumurtadan güveye uzanan yolculuğu; yumurta, larva, pupa ve yetişkin olmak üzere dört temel aşamadan oluşur. Bu değişim, doğadaki canlıların yaşamları boyunca ne kadar farklı görünümlere sahip olabileceğini gösterir.",
      "wordCount": 186,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Dut ağaçlarının yetişme koşullarını açıklamak"
            },
            {
              "key": "B",
              "text": "Farklı böcek türlerinin beslenme biçimlerini karşılaştırmak"
            },
            {
              "key": "C",
              "text": "İpek böceğinin gelişim aşamalarını ve koza oluşturmasını anlatmak"
            },
            {
              "key": "D",
              "text": "İpekten yapılan ürünlerin kullanım alanlarını tanıtmak"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "İpek böceği larvası gelişirken özellikle neyle beslenir?",
          "options": [
            {
              "key": "A",
              "text": "Dut ağacının yapraklarıyla"
            },
            {
              "key": "B",
              "text": "Çiçeklerin içindeki nektarla"
            },
            {
              "key": "C",
              "text": "Toprağın altındaki küçük köklerle"
            },
            {
              "key": "D",
              "text": "Ağaç kabuklarının parçalarıyla"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "İpek böceği gelişimi boyunca kaç kez deri değiştirir?",
          "options": [
            {
              "key": "A",
              "text": "İki kez"
            },
            {
              "key": "B",
              "text": "Üç kez"
            },
            {
              "key": "C",
              "text": "Beş kez"
            },
            {
              "key": "D",
              "text": "Dört kez"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q4",
          "question": "İpek böceğinin çevresine iplik sararak koza oluşturmasının temel nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Dut yapraklarını kozanın içinde saklamak"
            },
            {
              "key": "B",
              "text": "Pupa dönemini koruyucu bir yapı içinde geçirmek"
            },
            {
              "key": "C",
              "text": "Diğer ipek böceklerine yerini göstermek"
            },
            {
              "key": "D",
              "text": "Yetişkin güvenin uçmasını kolaylaştırmak"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "İpek böceğinin koza içindeki dönemiyle ilgili aşağıdakilerden hangisi söylenebilir?",
          "options": [
            {
              "key": "A",
              "text": "Hareketsiz görünmesine rağmen vücudunda önemli değişiklikler gerçekleşir."
            },
            {
              "key": "B",
              "text": "Yaşam döngüsü kozanın oluşmasıyla tamamen sona erer."
            },
            {
              "key": "C",
              "text": "Koza içinde beslenmeye ve hızla büyümeye devam eder."
            },
            {
              "key": "D",
              "text": "Yumurtalarını kozanın içindeyken bırakmaya başlar."
            }
          ],
          "correctAnswer": "A"
        }
      ]
    },
    {
      "id": "grade-4-text-07",
      "grade": "4",
      "number": 7,
      "title": "SU KEMERLERİ ŞEHİRLERE NASIL SU TAŞIRDI?",
      "paragraphs": [
        "Geçmişte büyük şehirlerin temiz suya ulaşması her zaman kolay değildi. Şehir merkezlerinden uzaktaki pınar ve kaynaklardan gelen suyu taşımak için su kemerleri yapılırdı. Bu yapıların en önemli özelliği, suyu pompa kullanmadan yer çekiminin yardımıyla hareket ettirmesiydi. Bunun için su kanalı, kaynaktan şehre doğru çok hafif bir eğimle inşa edilirdi. Eğim fazla olduğunda su kanala zarar verebilir, yetersiz olduğunda ise düzenli ilerleyemezdi.",
        "Su kemerlerinin tamamı yüksek taş köprülerden oluşmazdı. Yolun büyük bir bölümü yer altındaki tünellerden veya toprağa yakın kapalı kanallardan geçebilirdi. Kanal bir vadiyle karşılaştığında ise suyun aynı eğimle ilerleyebilmesi için kemerli köprüler yapılırdı. Kemer biçimi, taşların ağırlığını yanlara ve aşağıya dağıttığı için uzun yapıların sağlam kalmasına yardımcı olurdu.",
        "Kanala yaprak, çamur ve taş karışmaması için bazı bölümlerde çökeltme havuzları bulunurdu. Su bu havuzlarda yavaşladığında ağır maddeler dibe çökerdi. Görevliler kanalları düzenli olarak kontrol eder, tıkanan yerleri temizler ve çatlakları onarırdı. Şehre ulaşan su; çeşmelere, hamamlara, havuzlara ve bazı evlere dağıtılırdı.",
        "Fransa’daki ünlü Pont du Gard, yaklaşık 50 kilometrelik Nîmes su yolunun bir parçasıdır. Nehir vadisini aşmak için yapılan bu yapı üç katlı kemerlerden oluşur. Su kemerleri, geçmişte insanların yalnızca güçlü yapılar kurmadığını; eğim, uzaklık ve suyun hareketi hakkında dikkatli hesaplamalar yaptığını da gösterir."
      ],
      "content": "Geçmişte büyük şehirlerin temiz suya ulaşması her zaman kolay değildi. Şehir merkezlerinden uzaktaki pınar ve kaynaklardan gelen suyu taşımak için su kemerleri yapılırdı. Bu yapıların en önemli özelliği, suyu pompa kullanmadan yer çekiminin yardımıyla hareket ettirmesiydi. Bunun için su kanalı, kaynaktan şehre doğru çok hafif bir eğimle inşa edilirdi. Eğim fazla olduğunda su kanala zarar verebilir, yetersiz olduğunda ise düzenli ilerleyemezdi.\n\nSu kemerlerinin tamamı yüksek taş köprülerden oluşmazdı. Yolun büyük bir bölümü yer altındaki tünellerden veya toprağa yakın kapalı kanallardan geçebilirdi. Kanal bir vadiyle karşılaştığında ise suyun aynı eğimle ilerleyebilmesi için kemerli köprüler yapılırdı. Kemer biçimi, taşların ağırlığını yanlara ve aşağıya dağıttığı için uzun yapıların sağlam kalmasına yardımcı olurdu.\n\nKanala yaprak, çamur ve taş karışmaması için bazı bölümlerde çökeltme havuzları bulunurdu. Su bu havuzlarda yavaşladığında ağır maddeler dibe çökerdi. Görevliler kanalları düzenli olarak kontrol eder, tıkanan yerleri temizler ve çatlakları onarırdı. Şehre ulaşan su; çeşmelere, hamamlara, havuzlara ve bazı evlere dağıtılırdı.\n\nFransa’daki ünlü Pont du Gard, yaklaşık 50 kilometrelik Nîmes su yolunun bir parçasıdır. Nehir vadisini aşmak için yapılan bu yapı üç katlı kemerlerden oluşur. Su kemerleri, geçmişte insanların yalnızca güçlü yapılar kurmadığını; eğim, uzaklık ve suyun hareketi hakkında dikkatli hesaplamalar yaptığını da gösterir.",
      "wordCount": 194,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Geçmişte şehirlerde yapılan bütün taş yapıları tanıtmak"
            },
            {
              "key": "B",
              "text": "Su kemerlerinin suyu şehirlere nasıl taşıdığını açıklamak"
            },
            {
              "key": "C",
              "text": "Pınar ve nehirlerde yaşayan canlıları karşılaştırmak"
            },
            {
              "key": "D",
              "text": "Şehirlerdeki hamamların nasıl kullanıldığını anlatmak"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Çökeltme havuzlarının görevi nedir?",
          "options": [
            {
              "key": "A",
              "text": "Suyun daha hızlı akmasını sağlamak"
            },
            {
              "key": "B",
              "text": "Kanalın eğimini sürekli değiştirmek"
            },
            {
              "key": "C",
              "text": "Sudaki ağır maddelerin dibe çökmesine yardımcı olmak"
            },
            {
              "key": "D",
              "text": "Şehre ulaşan suyu yeniden kaynağa göndermek"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Pont du Gard’ın parçası olduğu Nîmes su yolu yaklaşık kaç kilometre uzunluğundadır?",
          "options": [
            {
              "key": "A",
              "text": "20 kilometre"
            },
            {
              "key": "B",
              "text": "30 kilometre"
            },
            {
              "key": "C",
              "text": "40 kilometre"
            },
            {
              "key": "D",
              "text": "50 kilometre"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q4",
          "question": "Su kanalının eğimi doğru ayarlanmasaydı aşağıdakilerden hangisi yaşanabilirdi?",
          "options": [
            {
              "key": "A",
              "text": "Su şehre düzenli biçimde ulaşamayabilirdi."
            },
            {
              "key": "B",
              "text": "Kemerlerin yapımında taşa ihtiyaç kalmayabilirdi."
            },
            {
              "key": "C",
              "text": "Pınarlardaki su miktarı kendiliğinden artabilirdi."
            },
            {
              "key": "D",
              "text": "Kanalların tamamı yer altında yapılabilirdi."
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q5",
          "question": "Metne göre su kemerleriyle ilgili aşağıdakilerden hangisi söylenebilir?",
          "options": [
            {
              "key": "A",
              "text": "Su yollarının tamamı yüksek taş köprüler üzerinde ilerlerdi."
            },
            {
              "key": "B",
              "text": "Suyun taşınması için yalnızca güçlü akıntılardan yararlanılırdı."
            },
            {
              "key": "C",
              "text": "Arazinin yapısına göre tünel, kanal ve kemerli köprüler kullanılırdı."
            },
            {
              "key": "D",
              "text": "Su kemerleri yalnızca çeşmelere su ulaştırmak amacıyla yapılırdı."
            }
          ],
          "correctAnswer": "C"
        }
      ]
    },
    {
      "id": "grade-4-text-08",
      "grade": "4",
      "number": 8,
      "title": "AY’DAKİ AYAK İZLERİ NEDEN SİLİNMEZ?",
      "paragraphs": [
        "Ay yüzeyinde astronotların bıraktığı ayak izleri, Dünya’daki izlerden çok daha uzun süre kalabilir. Bunun temel nedeni, Ay’da Dünya’daki gibi yoğun bir atmosferin bulunmamasıdır. Atmosfer olmadığı için rüzgâr esmez, yağmur yağmaz ve akarsular oluşmaz. Bu nedenle ayak izlerini kısa sürede aşındıracak hava olayları yaşanmaz.",
        "Ay’ın yüzeyi, regolit adı verilen ince kaya ve toz parçalarıyla kaplıdır. Astronotların ağır uzay giysileri ve özel tabanlı botları bu gevşek yüzeye bastığında belirgin izler oluşmuştur. Ay’daki yer çekimi, Dünya’dakinin yaklaşık altıda biri kadardır. Bu düşük çekim gücü astronotların daha hafif hareket etmesini sağlasa da bastıkları yüzeyde iz bırakmalarına engel olmamıştır.",
        "Apollo 11 astronotları, 20 Temmuz 1969’da Ay yüzeyinde yürümüş ve bu izlerin fotoğraflarını çekmiştir. Daha sonraki uzay araçları, iniş bölgelerindeki yürüyüş yollarını ve araç izlerini uzaydan görüntülemiştir. Ancak Ay’daki izlerin sonsuza kadar hiç değişmeden kalacağı söylenemez. Yüzeye çarpan çok küçük gök taşları ve uzaydan gelen parçacıklar, toprağı çok yavaş biçimde değiştirebilir. Bu değişim Dünya’daki yağmur ve rüzgârın etkisine göre son derece yavaş gerçekleşir.",
        "Ayak izlerinin uzun süre korunması, bilim insanlarına geçmiş uzay görevlerinin izlerini inceleme fırsatı verir. Bu durum aynı zamanda Ay ile Dünya arasındaki çevre farklarının yüzey şekillerini nasıl etkilediğini gösterir."
      ],
      "content": "Ay yüzeyinde astronotların bıraktığı ayak izleri, Dünya’daki izlerden çok daha uzun süre kalabilir. Bunun temel nedeni, Ay’da Dünya’daki gibi yoğun bir atmosferin bulunmamasıdır. Atmosfer olmadığı için rüzgâr esmez, yağmur yağmaz ve akarsular oluşmaz. Bu nedenle ayak izlerini kısa sürede aşındıracak hava olayları yaşanmaz.\n\nAy’ın yüzeyi, regolit adı verilen ince kaya ve toz parçalarıyla kaplıdır. Astronotların ağır uzay giysileri ve özel tabanlı botları bu gevşek yüzeye bastığında belirgin izler oluşmuştur. Ay’daki yer çekimi, Dünya’dakinin yaklaşık altıda biri kadardır. Bu düşük çekim gücü astronotların daha hafif hareket etmesini sağlasa da bastıkları yüzeyde iz bırakmalarına engel olmamıştır.\n\nApollo 11 astronotları, 20 Temmuz 1969’da Ay yüzeyinde yürümüş ve bu izlerin fotoğraflarını çekmiştir. Daha sonraki uzay araçları, iniş bölgelerindeki yürüyüş yollarını ve araç izlerini uzaydan görüntülemiştir. Ancak Ay’daki izlerin sonsuza kadar hiç değişmeden kalacağı söylenemez. Yüzeye çarpan çok küçük gök taşları ve uzaydan gelen parçacıklar, toprağı çok yavaş biçimde değiştirebilir. Bu değişim Dünya’daki yağmur ve rüzgârın etkisine göre son derece yavaş gerçekleşir.\n\nAyak izlerinin uzun süre korunması, bilim insanlarına geçmiş uzay görevlerinin izlerini inceleme fırsatı verir. Bu durum aynı zamanda Ay ile Dünya arasındaki çevre farklarının yüzey şekillerini nasıl etkilediğini gösterir.",
      "wordCount": 186,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Astronotların uzay giysilerinin nasıl üretildiğini anlatmak"
            },
            {
              "key": "B",
              "text": "Ay ile Dünya’nın büyüklüklerini karşılaştırmak"
            },
            {
              "key": "C",
              "text": "Ay’daki ayak izlerinin neden uzun süre kaldığını açıklamak"
            },
            {
              "key": "D",
              "text": "Uzay araçlarının Ay’a nasıl gönderildiğini göstermek"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "Metinde “regolit” sözcüğüyle anlatılan nedir?",
          "options": [
            {
              "key": "A",
              "text": "Ay yüzeyini kaplayan ince kaya ve toz parçaları"
            },
            {
              "key": "B",
              "text": "Astronotların kullandığı özel tabanlı uzay botları"
            },
            {
              "key": "C",
              "text": "Ay’ın çevresinde dolaşan küçük uzay araçları"
            },
            {
              "key": "D",
              "text": "Ay yüzeyinde oluşan derin ve geniş çukurlar"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "Ay’daki yer çekimi Dünya’dakinin yaklaşık ne kadarıdır?",
          "options": [
            {
              "key": "A",
              "text": "Yarısı"
            },
            {
              "key": "B",
              "text": "Altıda biri"
            },
            {
              "key": "C",
              "text": "Üçte biri"
            },
            {
              "key": "D",
              "text": "Dörtte biri"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q4",
          "question": "Ay’da Dünya’daki gibi rüzgâr ve yağmur olsaydı ne yaşanabilirdi?",
          "options": [
            {
              "key": "A",
              "text": "Astronotlar Ay yüzeyinde daha yükseğe sıçrayabilirdi."
            },
            {
              "key": "B",
              "text": "Ay’ın yer çekimi zamanla daha güçlü hâle gelebilirdi."
            },
            {
              "key": "C",
              "text": "Uzay araçlarının bıraktığı bütün parçalar yok olabilirdi."
            },
            {
              "key": "D",
              "text": "Ayak izleri daha kısa sürede aşınıp belirsizleşebilirdi."
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q5",
          "question": "Metne göre Ay’daki ayak izleriyle ilgili aşağıdakilerden hangisi söylenebilir?",
          "options": [
            {
              "key": "A",
              "text": "Hiçbir doğa olayı onları değiştiremez."
            },
            {
              "key": "B",
              "text": "Yalnızca uzay araçlarının geçtiği yerlerde oluşurlar."
            },
            {
              "key": "C",
              "text": "Çok yavaş değişseler de uzun süre korunabilirler."
            },
            {
              "key": "D",
              "text": "Dünya’daki ayak izlerinden daha kısa sürede kaybolurlar."
            }
          ],
          "correctAnswer": "C"
        }
      ]
    },
    {
      "id": "grade-4-text-09",
      "grade": "4",
      "number": 9,
      "title": "MERCAN RESİFLERİ NEDEN ÖNEMLİDİR?",
      "paragraphs": [
        "Mercan resifleri, sıcak ve sığ denizlerde yaşayan çok küçük canlıların uzun yıllar boyunca oluşturduğu yapılardır. Mercanlar dışarıdan renkli kayalara benzese de aslında hayvandır. Binlerce mercan canlısı bir araya gelerek koloniler kurar. Bu canlılar, kendilerini koruyan sert bir iskelet üretir. Eski iskeletlerin üzerine yenileri eklendikçe büyük resifler meydana gelir.",
        "Mercanların dokularında yaşayan çok küçük algler, güneş ışığını kullanarak besin üretir. Mercanlar da bu besinden yararlanır. Buna karşılık algler, mercanların korunaklı yapısında yaşar. Deniz suyu uzun süre normalden fazla ısındığında mercanlar strese girebilir ve renk veren algleri dışarı atabilir. Bu olay mercan beyazlaması olarak adlandırılır. Beyazlayan mercan hemen ölmez; ancak sıcaklık uzun süre yüksek kalırsa beslenmesi zorlaşır ve zarar görebilir.",
        "Mercan resifleri okyanus tabanının yüzde 1’inden daha azını kaplamasına rağmen deniz canlılarının yaklaşık yüzde 25’ine yaşam alanı sağlar. Balıklar, yengeçler, deniz yıldızları ve birçok küçük canlı burada beslenir, saklanır veya yavrularını büyütür. Resifler, güçlü dalgaların etkisini azaltarak kıyıların korunmasına da yardımcı olur. Bu nedenle hem deniz canlıları hem de insanlar için büyük önem taşırlar.",
        "Kirlilik, bilinçsiz avlanma ve deniz sıcaklığındaki artış mercan resiflerine zarar verebilir. Denizlere çöp atmamak, suyu kirletmemek ve koruma kurallarına uymak bu değerli yaşam alanlarının geleceği için önemlidir."
      ],
      "content": "Mercan resifleri, sıcak ve sığ denizlerde yaşayan çok küçük canlıların uzun yıllar boyunca oluşturduğu yapılardır. Mercanlar dışarıdan renkli kayalara benzese de aslında hayvandır. Binlerce mercan canlısı bir araya gelerek koloniler kurar. Bu canlılar, kendilerini koruyan sert bir iskelet üretir. Eski iskeletlerin üzerine yenileri eklendikçe büyük resifler meydana gelir.\n\nMercanların dokularında yaşayan çok küçük algler, güneş ışığını kullanarak besin üretir. Mercanlar da bu besinden yararlanır. Buna karşılık algler, mercanların korunaklı yapısında yaşar. Deniz suyu uzun süre normalden fazla ısındığında mercanlar strese girebilir ve renk veren algleri dışarı atabilir. Bu olay mercan beyazlaması olarak adlandırılır. Beyazlayan mercan hemen ölmez; ancak sıcaklık uzun süre yüksek kalırsa beslenmesi zorlaşır ve zarar görebilir.\n\nMercan resifleri okyanus tabanının yüzde 1’inden daha azını kaplamasına rağmen deniz canlılarının yaklaşık yüzde 25’ine yaşam alanı sağlar. Balıklar, yengeçler, deniz yıldızları ve birçok küçük canlı burada beslenir, saklanır veya yavrularını büyütür. Resifler, güçlü dalgaların etkisini azaltarak kıyıların korunmasına da yardımcı olur. Bu nedenle hem deniz canlıları hem de insanlar için büyük önem taşırlar.\n\nKirlilik, bilinçsiz avlanma ve deniz sıcaklığındaki artış mercan resiflerine zarar verebilir. Denizlere çöp atmamak, suyu kirletmemek ve koruma kurallarına uymak bu değerli yaşam alanlarının geleceği için önemlidir.",
      "wordCount": 189,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Denizlerde yaşayan bütün hayvan türlerini karşılaştırmak"
            },
            {
              "key": "B",
              "text": "Sıcak denizlerdeki su hareketlerini açıklamak"
            },
            {
              "key": "C",
              "text": "Mercan resiflerinin oluşumunu, önemini ve karşılaştığı tehlikeleri anlatmak"
            },
            {
              "key": "D",
              "text": "Kıyı bölgelerinde yapılan balıkçılık yöntemlerini tanıtmak"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "Mercanların dokularında yaşayan alglerin mercanlara sağladığı yarar nedir?",
          "options": [
            {
              "key": "A",
              "text": "Güneş ışığını kullanarak besin üretmeleri"
            },
            {
              "key": "B",
              "text": "Mercanların iskeletlerini parçalara ayırmaları"
            },
            {
              "key": "C",
              "text": "Deniz suyunun sıcaklığını azaltmaları"
            },
            {
              "key": "D",
              "text": "Güçlü dalgaların yönünü değiştirmeleri"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "Mercan resifleri deniz canlılarının yaklaşık yüzde kaçına yaşam alanı sağlar?",
          "options": [
            {
              "key": "A",
              "text": "Yüzde 5’ine"
            },
            {
              "key": "B",
              "text": "Yüzde 10’una"
            },
            {
              "key": "C",
              "text": "Yüzde 25’ine"
            },
            {
              "key": "D",
              "text": "Yüzde 50’sine"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q4",
          "question": "Deniz suyu uzun süre normalden daha sıcak kalırsa aşağıdakilerden hangisi yaşanabilir?",
          "options": [
            {
              "key": "A",
              "text": "Mercanlar daha hızlı büyüyerek bütün denizi kaplayabilir."
            },
            {
              "key": "B",
              "text": "Algler daha fazla besin üreterek suyu soğutabilir."
            },
            {
              "key": "C",
              "text": "Resiflerin çevresindeki dalgalar tamamen durabilir."
            },
            {
              "key": "D",
              "text": "Mercanlar alglerini kaybederek beslenmekte zorlanabilir."
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q5",
          "question": "Metne göre mercan resiflerinin zarar görmesi hangi sonucu doğurabilir?",
          "options": [
            {
              "key": "A",
              "text": "Okyanus tabanındaki bütün kayaların yok olmasını"
            },
            {
              "key": "B",
              "text": "Birçok deniz canlısının barınma ve beslenme alanı kaybetmesini"
            },
            {
              "key": "C",
              "text": "Deniz suyunun tamamen tatlı suya dönüşmesini"
            },
            {
              "key": "D",
              "text": "Kıyılardaki dalgaların her zaman daha yavaş hareket etmesini"
            }
          ],
          "correctAnswer": "B"
        }
      ]
    },
    {
      "id": "grade-4-text-10",
      "grade": "4",
      "number": 10,
      "title": "UÇAKLAR HAVADA NASIL KALIR?",
      "paragraphs": [
        "Bir uçak havalanırken motorları onu pist boyunca ileri doğru hızlandırır. Uçak hızlandıkça kanatların çevresinden daha fazla hava geçer. Kanatların özel biçimi ve havaya göre duruş açısı, havanın yönünü değiştirerek aşağı doğru hareket etmesini sağlar. Aynı zamanda kanadın üst ve alt yüzeylerinde farklı hava basınçları oluşur. Bunun sonucunda kanadı ve uçağı yukarı kaldıran kaldırma kuvveti meydana gelir.",
        "Uçuş sırasında uçağa etki eden dört temel kuvvet vardır: kaldırma, ağırlık, itme ve sürükleme. Ağırlık, yer çekimi nedeniyle uçağı aşağı çeker. Kaldırma kuvveti ağırlığa karşı çalışır. Motorların oluşturduğu itme uçağı ileri götürürken havanın oluşturduğu sürükleme bu harekete karşı koyar. Uçak düz ve sabit biçimde ilerlediğinde bu kuvvetler belirli bir denge içindedir.",
        "Kanatların arka bölümünde flap adı verilen hareketli parçalar bulunur. Pilotlar kalkış ve iniş sırasında flapları açarak kanadın havayı daha fazla aşağı yönlendirmesini ve düşük hızlarda yeterli kaldırma oluşmasını sağlar. Uçak gerekli hıza ulaştığında pilot burnu uygun açıyla yükseltir ve uçak yerden ayrılır.",
        "Uçağın yön değiştirmesi de kanatlardaki ve kuyruktaki hareketli yüzeylerle sağlanır. Pilot bu parçaları kontrol ederek uçağın yükselmesini, alçalmasını veya sağa ve sola dönmesini sağlar. Bu nedenle bir uçağın havada kalması yalnızca güçlü motorlara değil; kanatların biçimine, yeterli hıza ve dört kuvvet arasındaki dengeye bağlıdır."
      ],
      "content": "Bir uçak havalanırken motorları onu pist boyunca ileri doğru hızlandırır. Uçak hızlandıkça kanatların çevresinden daha fazla hava geçer. Kanatların özel biçimi ve havaya göre duruş açısı, havanın yönünü değiştirerek aşağı doğru hareket etmesini sağlar. Aynı zamanda kanadın üst ve alt yüzeylerinde farklı hava basınçları oluşur. Bunun sonucunda kanadı ve uçağı yukarı kaldıran kaldırma kuvveti meydana gelir.\n\nUçuş sırasında uçağa etki eden dört temel kuvvet vardır: kaldırma, ağırlık, itme ve sürükleme. Ağırlık, yer çekimi nedeniyle uçağı aşağı çeker. Kaldırma kuvveti ağırlığa karşı çalışır. Motorların oluşturduğu itme uçağı ileri götürürken havanın oluşturduğu sürükleme bu harekete karşı koyar. Uçak düz ve sabit biçimde ilerlediğinde bu kuvvetler belirli bir denge içindedir.\n\nKanatların arka bölümünde flap adı verilen hareketli parçalar bulunur. Pilotlar kalkış ve iniş sırasında flapları açarak kanadın havayı daha fazla aşağı yönlendirmesini ve düşük hızlarda yeterli kaldırma oluşmasını sağlar. Uçak gerekli hıza ulaştığında pilot burnu uygun açıyla yükseltir ve uçak yerden ayrılır.\n\nUçağın yön değiştirmesi de kanatlardaki ve kuyruktaki hareketli yüzeylerle sağlanır. Pilot bu parçaları kontrol ederek uçağın yükselmesini, alçalmasını veya sağa ve sola dönmesini sağlar. Bu nedenle bir uçağın havada kalması yalnızca güçlü motorlara değil; kanatların biçimine, yeterli hıza ve dört kuvvet arasındaki dengeye bağlıdır.",
      "wordCount": 193,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Uçakların havalanmasını ve havada kalmasını sağlayan etkenleri açıklamak"
            },
            {
              "key": "B",
              "text": "Havaalanlarında uygulanan güvenlik kurallarını tanıtmak"
            },
            {
              "key": "C",
              "text": "Uçakların iç bölümlerinin nasıl düzenlendiğini anlatmak"
            },
            {
              "key": "D",
              "text": "Pilotların yolculuk öncesinde yaptığı hazırlıkları sıralamak"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q2",
          "question": "Motorların oluşturduğu itme kuvvetinin görevi nedir?",
          "options": [
            {
              "key": "A",
              "text": "Uçağın ağırlığını artırmak"
            },
            {
              "key": "B",
              "text": "Uçağı ileri doğru hareket ettirmek"
            },
            {
              "key": "C",
              "text": "Kanatların yüzeyini genişletmek"
            },
            {
              "key": "D",
              "text": "Havanın sürükleme etkisini artırmak"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q3",
          "question": "Metne göre uçuş sırasında uçağa kaç temel kuvvet etki eder?",
          "options": [
            {
              "key": "A",
              "text": "İki"
            },
            {
              "key": "B",
              "text": "Üç"
            },
            {
              "key": "C",
              "text": "Dört"
            },
            {
              "key": "D",
              "text": "Beş"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q4",
          "question": "Flapların kalkış sırasında açılması uçağa nasıl yardımcı olur?",
          "options": [
            {
              "key": "A",
              "text": "Uçağın daha az yakıt taşımasını sağlar."
            },
            {
              "key": "B",
              "text": "Yer çekiminin etkisini tamamen ortadan kaldırır."
            },
            {
              "key": "C",
              "text": "Motorların çalışmasına gerek kalmamasını sağlar."
            },
            {
              "key": "D",
              "text": "Düşük hızda yeterli kaldırma kuvveti oluşmasına yardımcı olur."
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q5",
          "question": "Metinden aşağıdakilerden hangisi çıkarılabilir?",
          "options": [
            {
              "key": "A",
              "text": "Uçağın havada kalması yalnızca motorların gücüne bağlıdır."
            },
            {
              "key": "B",
              "text": "Uçağın uçabilmesi için farklı parçaların ve kuvvetlerin uyumlu çalışması gerekir."
            },
            {
              "key": "C",
              "text": "Sürükleme kuvveti uçağın daha hızlı ilerlemesini sağlar."
            },
            {
              "key": "D",
              "text": "Uçağın yönünü değiştirmek için yalnızca flaplar kullanılır."
            }
          ],
          "correctAnswer": "B"
        }
      ]
    }
  ],
  "5-6": [
    {
      "id": "grade-5-6-text-01",
      "grade": "5-6",
      "number": 1,
      "title": "KUTUP IŞIKLARI NASIL OLUŞUR?",
      "paragraphs": [
        "Kutup ışıkları, geceleri gökyüzünde dalgalanan yeşil, kırmızı, mor ve mavi renkli ışık şeritleridir. Kuzey Kutbu çevresinde görülenlere kuzey ışıkları, Güney Kutbu çevresinde görülenlere ise güney ışıkları denir. Bu etkileyici görüntünün kaynağı, Dünya’dan çok uzakta, Güneş’te başlayan bir olaydır.",
        "Güneş, uzaya sürekli olarak elektrik yüklü parçacıklar gönderir. Güneş rüzgârı adı verilen bu parçacık akışı Dünya’ya yaklaştığında gezegenimizin manyetik alanıyla karşılaşır. Manyetik alan, parçacıkların büyük bölümünü Dünya’dan uzaklaştırarak canlıları korur. Ancak bazı parçacıklar manyetik alan çizgilerini izleyerek kutup bölgelerine yönelir ve atmosferin üst katmanlarına ulaşır.",
        "Burada parçacıklar, oksijen ve azot gibi gazların atomlarıyla çarpışır. Çarpışma sırasında enerji kazanan atomlar, bir süre sonra bu enerjiyi ışık olarak geri verir. Ortaya çıkan renk, çarpışılan gazın türüne ve yüksekliğe göre değişebilir. Oksijen çoğunlukla yeşil ve kırmızı, azot ise mavi veya mor ışık oluşturabilir. Kutup ışıkları yaklaşık 100 kilometreden başlayıp yüzlerce kilometre yüksekliğe kadar uzanabilir.",
        "Kutup ışıklarını gözlemlemek için gökyüzünün karanlık ve bulutsuz olması gerekir. Şehir ışıkları gökyüzündeki soluk renkleri görmeyi zorlaştırdığı için gözlemciler genellikle yerleşim yerlerinden uzak alanları seçer. Ayrıca kış gecelerinin uzun olması, kutup bölgelerinde gözlem süresini artırır.",
        "Bu ışıklar her gece aynı güçte görülmez. Güneş’te meydana gelen güçlü patlamalar uzaya daha fazla parçacık gönderdiğinde kutup ışıkları daha parlak olabilir ve kutuplardan daha uzak bölgelerde de izlenebilir. Bilim insanları Güneş’i ve uzaydaki parçacık hareketlerini takip ederek bu olayların ne zaman güçlenebileceğini tahmin etmeye çalışır. Çünkü güçlü Güneş olayları yalnızca güzel ışıklar oluşturmaz; uyduların, haberleşme sistemlerinin ve elektrik şebekelerinin çalışmasını da etkileyebilir."
      ],
      "content": "Kutup ışıkları, geceleri gökyüzünde dalgalanan yeşil, kırmızı, mor ve mavi renkli ışık şeritleridir. Kuzey Kutbu çevresinde görülenlere kuzey ışıkları, Güney Kutbu çevresinde görülenlere ise güney ışıkları denir. Bu etkileyici görüntünün kaynağı, Dünya’dan çok uzakta, Güneş’te başlayan bir olaydır.\n\nGüneş, uzaya sürekli olarak elektrik yüklü parçacıklar gönderir. Güneş rüzgârı adı verilen bu parçacık akışı Dünya’ya yaklaştığında gezegenimizin manyetik alanıyla karşılaşır. Manyetik alan, parçacıkların büyük bölümünü Dünya’dan uzaklaştırarak canlıları korur. Ancak bazı parçacıklar manyetik alan çizgilerini izleyerek kutup bölgelerine yönelir ve atmosferin üst katmanlarına ulaşır.\n\nBurada parçacıklar, oksijen ve azot gibi gazların atomlarıyla çarpışır. Çarpışma sırasında enerji kazanan atomlar, bir süre sonra bu enerjiyi ışık olarak geri verir. Ortaya çıkan renk, çarpışılan gazın türüne ve yüksekliğe göre değişebilir. Oksijen çoğunlukla yeşil ve kırmızı, azot ise mavi veya mor ışık oluşturabilir. Kutup ışıkları yaklaşık 100 kilometreden başlayıp yüzlerce kilometre yüksekliğe kadar uzanabilir.\n\nKutup ışıklarını gözlemlemek için gökyüzünün karanlık ve bulutsuz olması gerekir. Şehir ışıkları gökyüzündeki soluk renkleri görmeyi zorlaştırdığı için gözlemciler genellikle yerleşim yerlerinden uzak alanları seçer. Ayrıca kış gecelerinin uzun olması, kutup bölgelerinde gözlem süresini artırır.\n\nBu ışıklar her gece aynı güçte görülmez. Güneş’te meydana gelen güçlü patlamalar uzaya daha fazla parçacık gönderdiğinde kutup ışıkları daha parlak olabilir ve kutuplardan daha uzak bölgelerde de izlenebilir. Bilim insanları Güneş’i ve uzaydaki parçacık hareketlerini takip ederek bu olayların ne zaman güçlenebileceğini tahmin etmeye çalışır. Çünkü güçlü Güneş olayları yalnızca güzel ışıklar oluşturmaz; uyduların, haberleşme sistemlerinin ve elektrik şebekelerinin çalışmasını da etkileyebilir.",
      "wordCount": 237,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Kutup bölgelerinde kullanılan gözlem araçlarını tanıtmak"
            },
            {
              "key": "B",
              "text": "Dünya’nın atmosfer katmanlarını ayrıntılı biçimde açıklamak"
            },
            {
              "key": "C",
              "text": "Kutup ışıklarının nasıl oluştuğunu ve etkilerini anlatmak"
            },
            {
              "key": "D",
              "text": "Güneş’in iç yapısını ve sıcaklığını incelemek"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "Kutup ışıklarının renkleri nasıl ortaya çıkar?",
          "options": [
            {
              "key": "A",
              "text": "Yüklü parçacıkların atmosferdeki gaz atomlarıyla çarpışmasıyla"
            },
            {
              "key": "B",
              "text": "Okyanusların Güneş’ten gelen ışığı gökyüzüne yansıtmasıyla"
            },
            {
              "key": "C",
              "text": "Kutup bölgelerindeki kar ve buzların renk değiştirmesiyle"
            },
            {
              "key": "D",
              "text": "Dünya’nın manyetik alanının kendiliğinden ışık üretmesiyle"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "Metne göre kutup ışıkları yaklaşık kaç kilometre yükseklikten başlayabilir?",
          "options": [
            {
              "key": "A",
              "text": "50 kilometre"
            },
            {
              "key": "B",
              "text": "100 kilometre"
            },
            {
              "key": "C",
              "text": "250 kilometre"
            },
            {
              "key": "D",
              "text": "500 kilometre"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q4",
          "question": "Kutup ışıklarını gözlemlemek isteyen kişilerin şehirlerden uzaklaşmasının temel nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Kutup ışıklarının yalnızca yerleşim olmayan alanlarda oluşması"
            },
            {
              "key": "B",
              "text": "Şehirlerde Dünya’nın manyetik alanının daha zayıf olması"
            },
            {
              "key": "C",
              "text": "Binaların yüklü parçacıkların hareketini durdurması"
            },
            {
              "key": "D",
              "text": "Şehir ışıklarının gökyüzündeki soluk renkleri görmeyi zorlaştırması"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q5",
          "question": "Metne göre güçlü Güneş olaylarıyla ilgili aşağıdakilerden hangisi söylenebilir?",
          "options": [
            {
              "key": "A",
              "text": "Yalnızca kutup bölgelerindeki hava sıcaklığını değiştirir."
            },
            {
              "key": "B",
              "text": "Kutup ışıklarının daha soluk ve dar bir alanda görülmesine neden olur."
            },
            {
              "key": "C",
              "text": "Işıkların daha geniş bölgelerde görülmesini sağlarken teknolojik sistemleri de etkileyebilir."
            },
            {
              "key": "D",
              "text": "Yüklü parçacıkların Dünya’nın çevresine ulaşmasını tamamen engeller."
            }
          ],
          "correctAnswer": "C"
        }
      ]
    },
    {
      "id": "grade-5-6-text-02",
      "grade": "5-6",
      "number": 2,
      "title": "BEYNİMİZ BİLGİLERİ NASIL HATIRLAR?",
      "paragraphs": [
        "Beynimiz, yaşadığımız her olayı aynı biçimde saklamaz. Bir bilgiyi hatırlayabilmemiz için önce ona dikkat etmemiz gerekir. Dikkat edilen sesler, görüntüler ve düşünceler kısa süreli olarak işlenir. Bilgi önemli bulunur, tekrar edilir veya başka bilgilerle ilişkilendirilirse daha kalıcı bir hâle gelebilir. Bu sürece belleğin oluşması denir.",
        "Beyinde hipokampus adı verilen bölge, yeni bilgilerin düzenlenmesinde ve anıların oluşturulmasında önemli görev üstlenir. Hipokampus, öğrenilen bir bilginin nerede ve ne zaman edinildiği gibi ayrıntıların bir araya getirilmesine yardım eder. Ancak anılar yalnızca tek bir bölgede saklanmaz. Görüntü, ses, duygu ve hareketle ilgili ayrıntılar beynin farklı bölümlerinde işlenir. Bir anıyı hatırladığımızda bu parçalar yeniden bir araya gelir.",
        "İnsan beyninde yaklaşık 86 milyar sinir hücresi bulunur. Nöron adı verilen bu hücreler, birbirleriyle bağlantılar kurarak bilgi iletir. Yeni bir şey öğrenildiğinde bazı bağlantılar güçlenebilir. Düzenli tekrar yapmak, bilgiyi kendi cümlelerimizle anlatmak ve önceki bilgilerle ilişkilendirmek bu bağlantıların güçlenmesine yardımcı olur. Örneğin yeni öğrenilen bir kavramı günlük yaşamdan bir örnekle açıklamak, bilginin yalnızca ezberlenmesini değil, anlamlandırılmasını da sağlar.",
        "Uyku da öğrenmede önemli bir yere sahiptir. Gün içinde edinilen bazı bilgiler uyku sırasında yeniden işlenerek daha kalıcı duruma getirilebilir. Bu nedenle uzun süre uykusuz kalmak, dikkat etmeyi ve öğrenilenleri hatırlamayı zorlaştırabilir. Ayrıca aralıksız çalışmak yerine kısa molalar vermek beynin yeni bilgileri düzenlemesine yardımcı olabilir.",
        "Unutmak her zaman beynin kötü çalıştığı anlamına gelmez. Beyin, gereksiz ayrıntıları eleyerek önemli bilgilere ulaşmayı kolaylaştırabilir. Etkili öğrenme; dikkat, anlamlandırma, tekrar, dinlenme ve uyku gibi birçok sürecin birlikte çalışmasıyla gerçekleşir."
      ],
      "content": "Beynimiz, yaşadığımız her olayı aynı biçimde saklamaz. Bir bilgiyi hatırlayabilmemiz için önce ona dikkat etmemiz gerekir. Dikkat edilen sesler, görüntüler ve düşünceler kısa süreli olarak işlenir. Bilgi önemli bulunur, tekrar edilir veya başka bilgilerle ilişkilendirilirse daha kalıcı bir hâle gelebilir. Bu sürece belleğin oluşması denir.\n\nBeyinde hipokampus adı verilen bölge, yeni bilgilerin düzenlenmesinde ve anıların oluşturulmasında önemli görev üstlenir. Hipokampus, öğrenilen bir bilginin nerede ve ne zaman edinildiği gibi ayrıntıların bir araya getirilmesine yardım eder. Ancak anılar yalnızca tek bir bölgede saklanmaz. Görüntü, ses, duygu ve hareketle ilgili ayrıntılar beynin farklı bölümlerinde işlenir. Bir anıyı hatırladığımızda bu parçalar yeniden bir araya gelir.\n\nİnsan beyninde yaklaşık 86 milyar sinir hücresi bulunur. Nöron adı verilen bu hücreler, birbirleriyle bağlantılar kurarak bilgi iletir. Yeni bir şey öğrenildiğinde bazı bağlantılar güçlenebilir. Düzenli tekrar yapmak, bilgiyi kendi cümlelerimizle anlatmak ve önceki bilgilerle ilişkilendirmek bu bağlantıların güçlenmesine yardımcı olur. Örneğin yeni öğrenilen bir kavramı günlük yaşamdan bir örnekle açıklamak, bilginin yalnızca ezberlenmesini değil, anlamlandırılmasını da sağlar.\n\nUyku da öğrenmede önemli bir yere sahiptir. Gün içinde edinilen bazı bilgiler uyku sırasında yeniden işlenerek daha kalıcı duruma getirilebilir. Bu nedenle uzun süre uykusuz kalmak, dikkat etmeyi ve öğrenilenleri hatırlamayı zorlaştırabilir. Ayrıca aralıksız çalışmak yerine kısa molalar vermek beynin yeni bilgileri düzenlemesine yardımcı olabilir.\n\nUnutmak her zaman beynin kötü çalıştığı anlamına gelmez. Beyin, gereksiz ayrıntıları eleyerek önemli bilgilere ulaşmayı kolaylaştırabilir. Etkili öğrenme; dikkat, anlamlandırma, tekrar, dinlenme ve uyku gibi birçok sürecin birlikte çalışmasıyla gerçekleşir.",
      "wordCount": 235,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Beynin farklı bölümlerinin büyüklüklerini karşılaştırmak"
            },
            {
              "key": "B",
              "text": "Bilgilerin beyinde nasıl işlendiğini ve hatırlandığını açıklamak"
            },
            {
              "key": "C",
              "text": "İnsanların neden farklı sürelerde uyuduğunu anlatmak"
            },
            {
              "key": "D",
              "text": "Sinir sistemi hastalıklarından korunma yollarını sıralamak"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Metne göre hipokampusun görevlerinden biri aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Yeni bilgilerin ve anıların düzenlenmesine yardımcı olmak"
            },
            {
              "key": "B",
              "text": "Vücudun bütün hareketlerini tek başına yönetmek"
            },
            {
              "key": "C",
              "text": "Gereksiz bilgilerin tamamını hemen silmek"
            },
            {
              "key": "D",
              "text": "Sinir hücrelerinin sayısını sürekli artırmak"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "İnsan beyninde yaklaşık kaç milyar sinir hücresi bulunur?",
          "options": [
            {
              "key": "A",
              "text": "46 milyar"
            },
            {
              "key": "B",
              "text": "68 milyar"
            },
            {
              "key": "C",
              "text": "86 milyar"
            },
            {
              "key": "D",
              "text": "106 milyar"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q4",
          "question": "Yeni öğrenilen bir bilgiyi günlük yaşamdan örneklerle açıklamak neden yararlı olabilir?",
          "options": [
            {
              "key": "A",
              "text": "Bilginin yalnızca kısa süreli bellekte kalmasını sağladığı için"
            },
            {
              "key": "B",
              "text": "Beyindeki bütün eski bilgilerin unutulmasını sağladığı için"
            },
            {
              "key": "C",
              "text": "Çalışırken uykuya ihtiyaç duyulmasını engellediği için"
            },
            {
              "key": "D",
              "text": "Bilginin anlamlandırılmasını ve önceki bilgilerle ilişkilendirilmesini sağladığı için"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q5",
          "question": "Metne göre bir öğrenci uzun süre ara vermeden çalışıp yeterince uyumazsa aşağıdakilerden hangisi yaşanabilir?",
          "options": [
            {
              "key": "A",
              "text": "Öğrendiği bütün bilgiler kalıcı hâle gelebilir."
            },
            {
              "key": "B",
              "text": "Dikkatini toplamakta ve bilgileri hatırlamakta zorlanabilir."
            },
            {
              "key": "C",
              "text": "Sinir hücreleri birbirleriyle iletişim kurmayı bırakabilir."
            },
            {
              "key": "D",
              "text": "Hipokampusun görevini beynin başka bir bölgesi üstlenebilir."
            }
          ],
          "correctAnswer": "B"
        }
      ]
    },
    {
      "id": "grade-5-6-text-03",
      "grade": "5-6",
      "number": 3,
      "title": "İÇME SUYU ŞEHİRLERE ULAŞMADAN ÖNCE NASIL ARITILIR?",
      "paragraphs": [
        "Musluğumuzdan akan su, evlere ulaşmadan önce çeşitli işlemlerden geçirilir. Baraj, göl, nehir veya yer altı kaynaklarından alınan su temiz görünse bile içinde çamur, kum, yaprak parçaları, mikroorganizmalar ve gözle görülemeyen maddeler bulunabilir. Bu nedenle su, doğrudan şebekeye verilmez; önce arıtma tesisine gönderilir.",
        "Tesise gelen su, ilk olarak büyük ızgaralardan geçirilir. Izgaralar; dal, yaprak ve taş gibi iri maddeleri tutar. Ardından suya, çok küçük kir parçacıklarının birbirine yapışmasını sağlayan özel maddeler eklenir. Su yavaşça karıştırıldığında parçacıklar birleşerek daha büyük ve ağır kümeler oluşturur. Bu kümeler çökeltme havuzlarının dibine iner.",
        "Üst bölümde kalan su daha sonra kum, çakıl veya farklı filtre malzemelerinden geçirilir. Filtreleme işlemi, suda kalmış daha küçük parçacıkların tutulmasını sağlar. Ancak suyun berrak görünmesi, içindeki bütün mikropların yok olduğu anlamına gelmez. Bu nedenle son aşamalardan biri dezenfeksiyondur. Dezenfeksiyonda klor, ozon veya morötesi ışık gibi yöntemlerden yararlanılabilir. Klor kullanıldığında etkili bir dezenfeksiyon sağlanabilmesi için suyun klorla en az 30 dakika temas etmesi önerilir.",
        "Arıtılan su, depolara gönderilmeden önce laboratuvarlarda kontrol edilir. Görevliler suyun bulanıklığını, kokusunu, kimyasal özelliklerini ve mikroorganizma içerip içermediğini inceler. Uygun bulunan su, borular aracılığıyla şehrin farklı bölgelerine dağıtılır.",
        "Su arıtma işlemi tek bir aşamadan oluşmaz. Çünkü her aşama farklı büyüklükteki kirleri veya mikroorganizmaları hedefler. Ayrıca temizlenen suyun evlere ulaşana kadar yeniden kirlenmemesi için depoların ve boruların da düzenli olarak korunması gerekir."
      ],
      "content": "Musluğumuzdan akan su, evlere ulaşmadan önce çeşitli işlemlerden geçirilir. Baraj, göl, nehir veya yer altı kaynaklarından alınan su temiz görünse bile içinde çamur, kum, yaprak parçaları, mikroorganizmalar ve gözle görülemeyen maddeler bulunabilir. Bu nedenle su, doğrudan şebekeye verilmez; önce arıtma tesisine gönderilir.\n\nTesise gelen su, ilk olarak büyük ızgaralardan geçirilir. Izgaralar; dal, yaprak ve taş gibi iri maddeleri tutar. Ardından suya, çok küçük kir parçacıklarının birbirine yapışmasını sağlayan özel maddeler eklenir. Su yavaşça karıştırıldığında parçacıklar birleşerek daha büyük ve ağır kümeler oluşturur. Bu kümeler çökeltme havuzlarının dibine iner.\n\nÜst bölümde kalan su daha sonra kum, çakıl veya farklı filtre malzemelerinden geçirilir. Filtreleme işlemi, suda kalmış daha küçük parçacıkların tutulmasını sağlar. Ancak suyun berrak görünmesi, içindeki bütün mikropların yok olduğu anlamına gelmez. Bu nedenle son aşamalardan biri dezenfeksiyondur. Dezenfeksiyonda klor, ozon veya morötesi ışık gibi yöntemlerden yararlanılabilir. Klor kullanıldığında etkili bir dezenfeksiyon sağlanabilmesi için suyun klorla en az 30 dakika temas etmesi önerilir.\n\nArıtılan su, depolara gönderilmeden önce laboratuvarlarda kontrol edilir. Görevliler suyun bulanıklığını, kokusunu, kimyasal özelliklerini ve mikroorganizma içerip içermediğini inceler. Uygun bulunan su, borular aracılığıyla şehrin farklı bölgelerine dağıtılır.\n\nSu arıtma işlemi tek bir aşamadan oluşmaz. Çünkü her aşama farklı büyüklükteki kirleri veya mikroorganizmaları hedefler. Ayrıca temizlenen suyun evlere ulaşana kadar yeniden kirlenmemesi için depoların ve boruların da düzenli olarak korunması gerekir.",
      "wordCount": 213,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Şehirlerde su tüketiminin neden arttığını açıklamak"
            },
            {
              "key": "B",
              "text": "İçme suyunun arıtılma ve dağıtılma sürecini anlatmak"
            },
            {
              "key": "C",
              "text": "Yer altı sularının nasıl meydana geldiğini göstermek"
            },
            {
              "key": "D",
              "text": "Evlerde su tasarrufu yapmanın yollarını sıralamak"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Çökeltme havuzlarında kir parçacıklarına ne olur?",
          "options": [
            {
              "key": "A",
              "text": "Birleşip ağırlaşarak havuzun dibine inerler."
            },
            {
              "key": "B",
              "text": "Borularla doğrudan evlere gönderilirler."
            },
            {
              "key": "C",
              "text": "Morötesi ışık sayesinde görünür hâle gelirler."
            },
            {
              "key": "D",
              "text": "Suyla birlikte filtrelerin üzerinden geçerler."
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "Klorla dezenfeksiyonda suyun klorla en az ne kadar temas etmesi önerilir?",
          "options": [
            {
              "key": "A",
              "text": "10 dakika"
            },
            {
              "key": "B",
              "text": "20 dakika"
            },
            {
              "key": "C",
              "text": "30 dakika"
            },
            {
              "key": "D",
              "text": "60 dakika"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q4",
          "question": "Filtreleme aşaması uygulanmasaydı aşağıdakilerden hangisi yaşanabilirdi?",
          "options": [
            {
              "key": "A",
              "text": "İri dallar ızgaralara daha kolay takılabilirdi."
            },
            {
              "key": "B",
              "text": "Suda kalan küçük parçacıkların bir bölümü tutulamayabilirdi."
            },
            {
              "key": "C",
              "text": "Suyun borularla şehre ulaşması daha güvenli olabilirdi."
            },
            {
              "key": "D",
              "text": "Çökeltme havuzlarında mikropların tamamı yok olabilirdi."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "İçme suyunun birden fazla aşamadan geçirilmesinin temel nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Her aşamanın farklı kirleri ve mikroorganizmaları hedeflemesi"
            },
            {
              "key": "B",
              "text": "Suyun kaynağına yeniden gönderilmesini kolaylaştırması"
            },
            {
              "key": "C",
              "text": "Bütün arıtma tesislerinin aynı büyüklükte olmasını sağlaması"
            },
            {
              "key": "D",
              "text": "Suyun yalnızca görüntüsünü ve kokusunu değiştirmesi"
            }
          ],
          "correctAnswer": "A"
        }
      ]
    },
    {
      "id": "grade-5-6-text-04",
      "grade": "5-6",
      "number": 4,
      "title": "İNTERNETTE BİLGİ NASIL YOLCULUK EDER?",
      "paragraphs": [
        "Bir internet sitesini açtığımızda bilgiler tek parça hâlinde bilgisayarımıza gelmez. Gönderilecek yazı, görüntü veya video önce paket adı verilen küçük veri parçalarına ayrılır. Her paketin üzerinde nereye gönderileceğini, hangi sırada olduğunu ve hangi bilgiye ait olduğunu belirten işaretler bulunur. Bu işaretler, paketlerin doğru adrese ulaşmasına yardımcı olur.",
        "Bir sitenin adını tarayıcıya yazdığımızda bilgisayarımız önce bu adın karşılığı olan sayısal internet adresini bulmaya çalışır. Bu işlemi, internetin telefon rehberine benzeyen DNS sistemi gerçekleştirir. Adres belirlendikten sonra isteğimiz modemden çıkar ve internet sağlayıcısının ağına ulaşır.",
        "Veri paketleri yolculuk sırasında yönlendirici adı verilen cihazlardan geçer. Yönlendiriciler, paketlerin ulaşacağı adresi kontrol eder ve uygun yolu seçer. Bütün paketlerin aynı yolu izlemesi gerekmez. Bir yol yoğun veya kullanılamaz durumdaysa bazı paketler farklı bir güzergâha yönlendirilebilir. Hedefe ulaşan paketler doğru sıraya konularak yeniden birleştirilir. Eksik bir paket varsa yeniden gönderilmesi istenebilir.",
        "İnternet verileri radyo dalgalarıyla, bakır kablolarla veya fiber optik kablolarla taşınabilir. Fiber optik kablolarda bilgi, ışık sinyalleri hâlinde ilerler. Bu sinyaller kablo içinde saniyede yaklaşık 200 bin kilometre yol alabilir. Okyanusların altına döşenen uzun fiber optik kablolar, farklı kıtalardaki internet ağlarını birbirine bağlar.",
        "Bir videonun geç açılması her zaman verinin yavaş ilerlediği anlamına gelmez. Ağdaki yoğunluk, sunucunun uzaklığı, bağlantı kalitesi ve cihazın çalışma hızı da bekleme süresini etkileyebilir. İnternette bir bilginin ekrana ulaşması; adres bulma, paketleme, yönlendirme ve yeniden birleştirme gibi birçok işlemin uyum içinde gerçekleşmesine bağlıdır."
      ],
      "content": "Bir internet sitesini açtığımızda bilgiler tek parça hâlinde bilgisayarımıza gelmez. Gönderilecek yazı, görüntü veya video önce paket adı verilen küçük veri parçalarına ayrılır. Her paketin üzerinde nereye gönderileceğini, hangi sırada olduğunu ve hangi bilgiye ait olduğunu belirten işaretler bulunur. Bu işaretler, paketlerin doğru adrese ulaşmasına yardımcı olur.\n\nBir sitenin adını tarayıcıya yazdığımızda bilgisayarımız önce bu adın karşılığı olan sayısal internet adresini bulmaya çalışır. Bu işlemi, internetin telefon rehberine benzeyen DNS sistemi gerçekleştirir. Adres belirlendikten sonra isteğimiz modemden çıkar ve internet sağlayıcısının ağına ulaşır.\n\nVeri paketleri yolculuk sırasında yönlendirici adı verilen cihazlardan geçer. Yönlendiriciler, paketlerin ulaşacağı adresi kontrol eder ve uygun yolu seçer. Bütün paketlerin aynı yolu izlemesi gerekmez. Bir yol yoğun veya kullanılamaz durumdaysa bazı paketler farklı bir güzergâha yönlendirilebilir. Hedefe ulaşan paketler doğru sıraya konularak yeniden birleştirilir. Eksik bir paket varsa yeniden gönderilmesi istenebilir.\n\nİnternet verileri radyo dalgalarıyla, bakır kablolarla veya fiber optik kablolarla taşınabilir. Fiber optik kablolarda bilgi, ışık sinyalleri hâlinde ilerler. Bu sinyaller kablo içinde saniyede yaklaşık 200 bin kilometre yol alabilir. Okyanusların altına döşenen uzun fiber optik kablolar, farklı kıtalardaki internet ağlarını birbirine bağlar.\n\nBir videonun geç açılması her zaman verinin yavaş ilerlediği anlamına gelmez. Ağdaki yoğunluk, sunucunun uzaklığı, bağlantı kalitesi ve cihazın çalışma hızı da bekleme süresini etkileyebilir. İnternette bir bilginin ekrana ulaşması; adres bulma, paketleme, yönlendirme ve yeniden birleştirme gibi birçok işlemin uyum içinde gerçekleşmesine bağlıdır.",
      "wordCount": 222,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "İnternetteki bilgilerin cihazlar arasında nasıl taşındığını açıklamak"
            },
            {
              "key": "B",
              "text": "Bilgisayarların içindeki parçaların görevlerini tanıtmak"
            },
            {
              "key": "C",
              "text": "İnternet sitelerinin tasarım aşamalarını sıralamak"
            },
            {
              "key": "D",
              "text": "İnsanların interneti hangi amaçlarla kullandığını karşılaştırmak"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q2",
          "question": "DNS sisteminin görevi aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Veri paketlerini hedefte yeniden birleştirmek"
            },
            {
              "key": "B",
              "text": "İnternet sitesi adının sayısal adresini bulmak"
            },
            {
              "key": "C",
              "text": "Fiber optik kabloları dış etkilerden korumak"
            },
            {
              "key": "D",
              "text": "Videoların görüntü kalitesini yükseltmek"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q3",
          "question": "Fiber optik kablolardaki ışık sinyalleri saniyede yaklaşık kaç kilometre yol alabilir?",
          "options": [
            {
              "key": "A",
              "text": "20 bin kilometre"
            },
            {
              "key": "B",
              "text": "50 bin kilometre"
            },
            {
              "key": "C",
              "text": "100 bin kilometre"
            },
            {
              "key": "D",
              "text": "200 bin kilometre"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q4",
          "question": "Ağdaki bir yol yoğunlaştığında veri paketleriyle ilgili ne yaşanabilir?",
          "options": [
            {
              "key": "A",
              "text": "Paketlerin tamamı gönderilmeden silinebilir."
            },
            {
              "key": "B",
              "text": "Bazı paketler farklı bir yoldan hedefe yönlendirilebilir."
            },
            {
              "key": "C",
              "text": "İnternet sitesinin sayısal adresi değişebilir."
            },
            {
              "key": "D",
              "text": "Paketlerin üzerindeki bütün işaretler kaldırılabilir."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "Bir videonun geç açılmasıyla ilgili metinden hangi sonuca ulaşılabilir?",
          "options": [
            {
              "key": "A",
              "text": "Gecikmenin yalnızca fiber optik kabloların uzunluğundan kaynaklandığına"
            },
            {
              "key": "B",
              "text": "Veri paketlerinin her zaman yanlış sırayla ulaştığına"
            },
            {
              "key": "C",
              "text": "Bağlantı süresini birden fazla etkenin belirleyebileceğine"
            },
            {
              "key": "D",
              "text": "İnternetteki bütün bilgilerin tek parça hâlinde taşındığına"
            }
          ],
          "correctAnswer": "C"
        }
      ]
    },
    {
      "id": "grade-5-6-text-05",
      "grade": "5-6",
      "number": 5,
      "title": "GÖBEKLİTEPE GEÇMİŞİMİZ HAKKINDA NE ANLATIYOR?",
      "paragraphs": [
        "Göbeklitepe, Şanlıurfa’nın yaklaşık 18 kilometre kuzeydoğusunda bulunan tarih öncesi bir arkeolojik alandır. Buradaki yapılar, çanak çömleğin henüz kullanılmadığı Neolitik Dönem’e aittir. UNESCO’ya göre anıtsal yapıların büyük bölümü MÖ 9600 ile MÖ 8200 yılları arasında, avcılık ve toplayıcılıkla yaşamını sürdüren topluluklar tarafından yapılmıştır. Bu tarih, insanların henüz bugünkü anlamda büyük kentler kurmadığı çok eski bir dönemi gösterir.",
        "Alanda yuvarlak, oval ve dikdörtgen biçimli yapılar bulunmuştur. Bu yapıların içinde T biçiminde büyük taş dikmeler yer alır. Bazı dikmelerin üzerinde tilki, yılan, yaban domuzu, kuş ve akrep gibi hayvan kabartmaları görülür. Kimi taşlarda kol, el ve kemer benzeri ayrıntıların bulunması, T biçimli dikmelerin insanı simgeliyor olabileceğini düşündürür. Ancak bu sembollerin kesin anlamı henüz bilinmemektedir.",
        "Göbeklitepe’yi önemli kılan yalnızca yapıların eski olması değildir. Tonlarca ağırlığındaki taşların kesilmesi, taşınması ve belirli bir düzene göre yerleştirilmesi, birçok insanın planlı biçimde birlikte çalıştığını gösterir. Bu toplulukların gelişmiş metal araçları ve motorlu taşıtları yoktu. Buna rağmen büyük yapılar meydana getirebilmeleri, tarih öncesi insanların bilgi, iş birliği ve düzen kurma becerileri hakkında yeni sorular ortaya çıkarmıştır.",
        "Araştırmacılar, yapıların günlük yaşamdan çok toplu buluşmalar ve törenlerle bağlantılı olabileceğini düşünmektedir. Fakat Göbeklitepe hakkında her sorunun cevabı bulunmuş değildir. Yapıların neden daha sonra toprakla doldurulduğu ve bazı kabartmaların ne anlattığı hâlâ araştırılmaktadır. Kazılarda ortaya çıkarılan her yeni buluntu, geçmişte yaşayan toplulukların düşünce dünyasını biraz daha anlamamıza yardım eder. Bu nedenle Göbeklitepe, yalnızca eski taşlardan oluşan bir alan değil, insanlığın ortak geçmişini araştıran büyük bir bilgi kaynağıdır."
      ],
      "content": "Göbeklitepe, Şanlıurfa’nın yaklaşık 18 kilometre kuzeydoğusunda bulunan tarih öncesi bir arkeolojik alandır. Buradaki yapılar, çanak çömleğin henüz kullanılmadığı Neolitik Dönem’e aittir. UNESCO’ya göre anıtsal yapıların büyük bölümü MÖ 9600 ile MÖ 8200 yılları arasında, avcılık ve toplayıcılıkla yaşamını sürdüren topluluklar tarafından yapılmıştır. Bu tarih, insanların henüz bugünkü anlamda büyük kentler kurmadığı çok eski bir dönemi gösterir.\n\nAlanda yuvarlak, oval ve dikdörtgen biçimli yapılar bulunmuştur. Bu yapıların içinde T biçiminde büyük taş dikmeler yer alır. Bazı dikmelerin üzerinde tilki, yılan, yaban domuzu, kuş ve akrep gibi hayvan kabartmaları görülür. Kimi taşlarda kol, el ve kemer benzeri ayrıntıların bulunması, T biçimli dikmelerin insanı simgeliyor olabileceğini düşündürür. Ancak bu sembollerin kesin anlamı henüz bilinmemektedir.\n\nGöbeklitepe’yi önemli kılan yalnızca yapıların eski olması değildir. Tonlarca ağırlığındaki taşların kesilmesi, taşınması ve belirli bir düzene göre yerleştirilmesi, birçok insanın planlı biçimde birlikte çalıştığını gösterir. Bu toplulukların gelişmiş metal araçları ve motorlu taşıtları yoktu. Buna rağmen büyük yapılar meydana getirebilmeleri, tarih öncesi insanların bilgi, iş birliği ve düzen kurma becerileri hakkında yeni sorular ortaya çıkarmıştır.\n\nAraştırmacılar, yapıların günlük yaşamdan çok toplu buluşmalar ve törenlerle bağlantılı olabileceğini düşünmektedir. Fakat Göbeklitepe hakkında her sorunun cevabı bulunmuş değildir. Yapıların neden daha sonra toprakla doldurulduğu ve bazı kabartmaların ne anlattığı hâlâ araştırılmaktadır. Kazılarda ortaya çıkarılan her yeni buluntu, geçmişte yaşayan toplulukların düşünce dünyasını biraz daha anlamamıza yardım eder. Bu nedenle Göbeklitepe, yalnızca eski taşlardan oluşan bir alan değil, insanlığın ortak geçmişini araştıran büyük bir bilgi kaynağıdır.",
      "wordCount": 234,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Neolitik Dönem’de kullanılan bütün araçları tanıtmak"
            },
            {
              "key": "B",
              "text": "Şanlıurfa çevresindeki tarihî yerleri karşılaştırmak"
            },
            {
              "key": "C",
              "text": "Göbeklitepe’nin özelliklerini ve insanlık tarihi açısından önemini açıklamak"
            },
            {
              "key": "D",
              "text": "Avcı ve toplayıcı toplulukların günlük beslenmesini anlatmak"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "Bazı T biçimli dikmelerde kol, el ve kemer ayrıntılarının bulunması neyi düşündürmektedir?",
          "options": [
            {
              "key": "A",
              "text": "Dikmelerin yalnızca yapıların çatısını taşıdığını"
            },
            {
              "key": "B",
              "text": "Dikmelerin insanı simgeliyor olabileceğini"
            },
            {
              "key": "C",
              "text": "Taşların farklı bölgelerden getirildiğini"
            },
            {
              "key": "D",
              "text": "Kabartmaların daha sonraki dönemlerde yapıldığını"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q3",
          "question": "UNESCO’ya göre Göbeklitepe’deki anıtsal yapıların büyük bölümü hangi yıllar arasında yapılmıştır?",
          "options": [
            {
              "key": "A",
              "text": "MÖ 9600 ile MÖ 8200 arasında"
            },
            {
              "key": "B",
              "text": "MÖ 8200 ile MÖ 7000 arasında"
            },
            {
              "key": "C",
              "text": "MÖ 6000 ile MÖ 4800 arasında"
            },
            {
              "key": "D",
              "text": "MÖ 3000 ile MÖ 1800 arasında"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q4",
          "question": "Büyük taşların gelişmiş araçlar olmadan taşınıp düzenli biçimde yerleştirilmesi hangi sonuca ulaşmamızı sağlar?",
          "options": [
            {
              "key": "A",
              "text": "Yapıların yalnızca birkaç kişi tarafından kısa sürede tamamlandığına"
            },
            {
              "key": "B",
              "text": "İnsanların taşları doğal yerlerinde hiç değiştirmeden kullandığına"
            },
            {
              "key": "C",
              "text": "Toplulukların tarım dışında hiçbir konuda bilgi sahibi olmadığına"
            },
            {
              "key": "D",
              "text": "İnsanların planlama ve iş birliği yapabildiğine"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q5",
          "question": "Metinde Göbeklitepe’nin “büyük bir bilgi kaynağı” olarak tanımlanmasının nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Bölgede kullanılan bütün araçların eksiksiz bulunmuş olması"
            },
            {
              "key": "B",
              "text": "Yeni buluntuların geçmiş toplulukları anlamamıza yardım etmesi"
            },
            {
              "key": "C",
              "text": "Yapıların hangi amaçla kullanıldığının kesin olarak bilinmesi"
            },
            {
              "key": "D",
              "text": "Göbeklitepe’deki bütün alanların kazılarak ortaya çıkarılması"
            }
          ],
          "correctAnswer": "B"
        }
      ]
    }
  ],
  "7-8": [
    {
      "id": "grade-7-8-text-01",
      "grade": "7-8",
      "number": 1,
      "title": "YANLIŞ BİLGİLER İNTERNETTE NEDEN HIZLA YAYILIR?",
      "paragraphs": [
        "İnternette karşılaştığımız her bilgi doğru değildir. Yanlış bilgi bazen eksik araştırma, yanlış anlama veya dikkatsizlik sonucu ortaya çıkar; bazen de insanları yönlendirmek amacıyla bilinçli olarak hazırlanır. Kaynağı ne olursa olsun, dikkat çekici bir başlıkla sunulan bilgi birkaç saniye içinde binlerce kişiye ulaşabilir. Çünkü sosyal medya, kullanıcıların içerikleri tek dokunuşla paylaşmasına imkân verir.",
        "Yanlış bilgilerin hızlı yayılmasının önemli nedenlerinden biri, insanların şaşırtıcı ve alışılmadık haberlere daha fazla ilgi göstermesidir. “Kimsenin bilmediği gerçek ortaya çıktı!” veya “Bu bilgi herkesten saklanıyor!” gibi ifadeler merak uyandırır. Öfke, korku ve hayret oluşturan içerikler de kullanıcıları düşünmeden tepki vermeye yöneltebilir. Bir kişi haberi doğrulamadan paylaştığında, onu gören arkadaşları paylaşımı tanıdıkları birinden geldiği için daha güvenilir sanabilir.",
        "İnsanlar ayrıca daha önceden inandıkları düşünceleri destekleyen bilgileri kolayca kabul edebilir. Buna doğrulama yanlılığı denir. Kişi, kendi görüşüne uyan bir iddiayı ayrıntılı biçimde incelemezken görüşüne ters düşen bir bilgide hemen hata arayabilir. Böylece aynı düşünceyi paylaşan kullanıcıların bulunduğu çevrelerde yanlış bir iddia sürekli tekrarlanır. Bir bilginin çok kez görülmesi ise onun kanıtlanmış olduğu anlamına gelmediği hâlde tanıdık ve doğru görünmesine yol açabilir.",
        "Sosyal medya platformları, kullanıcıların ilgisini çekebilecek paylaşımları öne çıkaran sistemler kullanır. Çok yorum alan, hızla paylaşılan veya uzun süre görüntülenen içerikler daha fazla kişiye önerilebilir. Bu durum yalnızca yanlış bilgiler için geçerli değildir; ancak yanıltıcı bir paylaşım güçlü bir tepki oluşturduğunda yayılma hızı artabilir. MIT araştırmacılarının Twitter’da 2006-2017 yılları arasında yayılan haberleri inceleyen çalışmasında, yanlış haberlerin doğru haberlere göre yeniden paylaşılma ihtimalinin yüzde 70 daha fazla olduğu belirlenmiştir. Araştırma, bu farkta yalnızca otomatik hesapların değil, insanların paylaşım tercihlerinin de önemli olduğunu göstermiştir.",
        "Yanlış bilgiden korunmak için paylaşımın başlığıyla yetinmemek gerekir. Haberin kim tarafından yayımlandığına, yayın tarihine, kullanılan görselin olayla gerçekten ilgili olup olmadığına ve aynı bilginin güvenilir başka kaynaklarda bulunup bulunmadığına bakılmalıdır. “Hemen paylaşın” gibi acele ettiren ifadeler karşısında kısa bir süre durmak bile önemli bir önlemdir. İnternette sorumlu davranmak, yalnızca yanlış bilgiye inanmamak değil, onu başkalarına ulaştırmadan önce doğrulamaktır."
      ],
      "content": "İnternette karşılaştığımız her bilgi doğru değildir. Yanlış bilgi bazen eksik araştırma, yanlış anlama veya dikkatsizlik sonucu ortaya çıkar; bazen de insanları yönlendirmek amacıyla bilinçli olarak hazırlanır. Kaynağı ne olursa olsun, dikkat çekici bir başlıkla sunulan bilgi birkaç saniye içinde binlerce kişiye ulaşabilir. Çünkü sosyal medya, kullanıcıların içerikleri tek dokunuşla paylaşmasına imkân verir.\n\nYanlış bilgilerin hızlı yayılmasının önemli nedenlerinden biri, insanların şaşırtıcı ve alışılmadık haberlere daha fazla ilgi göstermesidir. “Kimsenin bilmediği gerçek ortaya çıktı!” veya “Bu bilgi herkesten saklanıyor!” gibi ifadeler merak uyandırır. Öfke, korku ve hayret oluşturan içerikler de kullanıcıları düşünmeden tepki vermeye yöneltebilir. Bir kişi haberi doğrulamadan paylaştığında, onu gören arkadaşları paylaşımı tanıdıkları birinden geldiği için daha güvenilir sanabilir.\n\nİnsanlar ayrıca daha önceden inandıkları düşünceleri destekleyen bilgileri kolayca kabul edebilir. Buna doğrulama yanlılığı denir. Kişi, kendi görüşüne uyan bir iddiayı ayrıntılı biçimde incelemezken görüşüne ters düşen bir bilgide hemen hata arayabilir. Böylece aynı düşünceyi paylaşan kullanıcıların bulunduğu çevrelerde yanlış bir iddia sürekli tekrarlanır. Bir bilginin çok kez görülmesi ise onun kanıtlanmış olduğu anlamına gelmediği hâlde tanıdık ve doğru görünmesine yol açabilir.\n\nSosyal medya platformları, kullanıcıların ilgisini çekebilecek paylaşımları öne çıkaran sistemler kullanır. Çok yorum alan, hızla paylaşılan veya uzun süre görüntülenen içerikler daha fazla kişiye önerilebilir. Bu durum yalnızca yanlış bilgiler için geçerli değildir; ancak yanıltıcı bir paylaşım güçlü bir tepki oluşturduğunda yayılma hızı artabilir. MIT araştırmacılarının Twitter’da 2006-2017 yılları arasında yayılan haberleri inceleyen çalışmasında, yanlış haberlerin doğru haberlere göre yeniden paylaşılma ihtimalinin yüzde 70 daha fazla olduğu belirlenmiştir. Araştırma, bu farkta yalnızca otomatik hesapların değil, insanların paylaşım tercihlerinin de önemli olduğunu göstermiştir.\n\nYanlış bilgiden korunmak için paylaşımın başlığıyla yetinmemek gerekir. Haberin kim tarafından yayımlandığına, yayın tarihine, kullanılan görselin olayla gerçekten ilgili olup olmadığına ve aynı bilginin güvenilir başka kaynaklarda bulunup bulunmadığına bakılmalıdır. “Hemen paylaşın” gibi acele ettiren ifadeler karşısında kısa bir süre durmak bile önemli bir önlemdir. İnternette sorumlu davranmak, yalnızca yanlış bilgiye inanmamak değil, onu başkalarına ulaştırmadan önce doğrulamaktır.",
      "wordCount": 312,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Sosyal medya platformlarının teknik özelliklerini karşılaştırmak"
            },
            {
              "key": "B",
              "text": "İnternette yayımlanan bilgilerin nasıl hazırlandığını açıklamak"
            },
            {
              "key": "C",
              "text": "Yanlış bilgilerin yayılma nedenlerini ve korunma yollarını anlatmak"
            },
            {
              "key": "D",
              "text": "İnsanların internet kullanma alışkanlıklarını sınıflandırmak"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "Bir bilginin internette sürekli tekrarlanması kullanıcıları nasıl etkileyebilir?",
          "options": [
            {
              "key": "A",
              "text": "Bilginin tanıdık ve doğruymuş gibi görünmesine neden olabilir."
            },
            {
              "key": "B",
              "text": "Bilginin kaynağının kendiliğinden güvenilir hâle gelmesini sağlayabilir."
            },
            {
              "key": "C",
              "text": "Kullanıcıların duygusal tepkiler vermesini tamamen engelleyebilir."
            },
            {
              "key": "D",
              "text": "Paylaşımın sosyal medya sistemlerinden kaldırılmasını sağlayabilir."
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "Araştırmaya göre yanlış haberlerin doğru haberlere kıyasla yeniden paylaşılma ihtimali yüzde kaç daha fazladır?",
          "options": [
            {
              "key": "A",
              "text": "Yüzde 30"
            },
            {
              "key": "B",
              "text": "Yüzde 45"
            },
            {
              "key": "C",
              "text": "Yüzde 60"
            },
            {
              "key": "D",
              "text": "Yüzde 70"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q4",
          "question": "Kendi düşüncesini destekleyen bir haberi araştırmadan kabul eden ancak görüşüne ters düşen bilgide hemen hata arayan kişi hangi durumun etkisindedir?",
          "options": [
            {
              "key": "A",
              "text": "Bilginin sürekli tekrarlanmasının"
            },
            {
              "key": "B",
              "text": "Doğrulama yanlılığının"
            },
            {
              "key": "C",
              "text": "Kaynağın belirsiz olmasının"
            },
            {
              "key": "D",
              "text": "Öneri sistemlerinin"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "Yanıltıcı bir paylaşımın çok sayıda yorum ve etkileşim aldıktan sonra daha geniş bir kitleye ulaşmasının nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Çok paylaşılan içeriklerin doğruluğunun platformlar tarafından onaylanması"
            },
            {
              "key": "B",
              "text": "Otomatik hesapların yalnızca yanıltıcı içerikleri paylaşması"
            },
            {
              "key": "C",
              "text": "İlgi gören içeriklerin öneri sistemleri tarafından öne çıkarılabilmesi"
            },
            {
              "key": "D",
              "text": "Kullanıcıların haberin yayın tarihini kontrol ederek paylaşım yapması"
            }
          ],
          "correctAnswer": "C"
        }
      ]
    },
    {
      "id": "grade-7-8-text-02",
      "grade": "7-8",
      "number": 2,
      "title": "AZİZ SANCAR’IN BİLİME UZANAN YOLCULUĞU",
      "paragraphs": [
        "Aziz Sancar, 8 Eylül 1946’da Mardin’in Savur ilçesinde, sekiz çocuklu bir ailenin yedinci çocuğu olarak dünyaya geldi. Anne ve babası örgün eğitim görmemişti; buna rağmen çocuklarının öğrenmesine büyük önem veriyordu. Sancar, çocukluk yıllarında ailesine bahçe işlerinde yardım etti, okul takımında kalecilik yaptı ve küçük yaşlardan itibaren bilime ilgi duydu. İlk ve ortaöğrenimini Mardin’de tamamladıktan sonra İstanbul Üniversitesi Tıp Fakültesine girdi. Mezuniyetinin ardından bir süre Savur’da hekimlik yapması, ona yalnızca insan vücudunu değil, bilginin insan yaşamındaki değerini de yakından görme fırsatı verdi.",
        "Bilimsel araştırma yapma isteği onu Amerika Birleşik Devletleri’ne götürdü. Ancak bu yolculuk başlangıçta beklediği gibi ilerlemedi. İngilizce iletişim kurmakta zorlanması ve yeni çevresine uyum sağlayamaması nedeniyle Johns Hopkins Üniversitesindeki ilk girişimini yarıda bırakarak Türkiye’ye döndü. Bir süre sonra dilini geliştirip daha hazırlıklı biçimde yeniden Amerika’ya gitti ve 1973’te Teksas Üniversitesinin Dallas’taki programına kabul edildi. Burada, ışığın zarar görmüş DNA’nın onarılmasına nasıl yardımcı olduğunu araştıran Claud Rupert’ın laboratuvarında çalışmaya başladı.",
        "Sancar’ın önündeki önemli sorunlardan biri, fotoliyaz adı verilen onarım enziminin yeterli miktarda elde edilememesiydi. Çözüm için önce ilgili gende bozukluk bulunan özel bir bakteri geliştirmesi gerekiyordu. Tasarladığı deneyi altı ay boyunca günde bir ya da iki kez tekrarlamasına rağmen uzun süre sonuç alamadı. Üstelik bir çalışma arkadaşı, laboratuvar araştırmasına uygun olmadığını söyleyerek hekimliğe dönmesini önerdi. Sancar çalışmayı bırakmadı; farklı alanlardan topladığı bilgileri bir araya getirerek deney yöntemini geliştirdi ve sonunda gerekli bakteriyi elde etti. 1975’te fotoliyazla ilgili geni kopyalamayı başardı. Bu sonuç, yalnızca araştırmasını ilerletmedi; başarısızlıklar karşısında yöntem değiştirmenin ve sabırlı olmanın bilimsel çalışmanın bir parçası olduğunu da gösterdi.",
        "Sonraki yıllarda DNA’nın ultraviyole ışınlarıyla zarar gören bölümlerinin hücre tarafından nasıl kesilip çıkarıldığını ve yeniden onarıldığını ayrıntılı biçimde haritalandırdı. DNA, canlıların kalıtsal bilgisini taşır fakat güneş ışınları, kimyasal maddeler ve hücre bölünmesi sırasında oluşan hatalar nedeniyle sürekli zarar görebilir. Onarım sistemleri çalışmadığında bu hasarlar birikebilir ve bazı hastalıkların ortaya çıkmasına zemin hazırlayabilir. Sancar’ın çalışmaları, hücrelerin genetik bilgiyi nasıl koruduğunu anlamamıza ve kanser araştırmalarına temel oluşturan süreçlerin açıklanmasına katkı sağladı.",
        "Aziz Sancar, DNA onarımı konusundaki çalışmaları nedeniyle Tomas Lindahl ve Paul Modrich ile birlikte 2015 Nobel Kimya Ödülü’ne layık görüldü. Ancak bu ödül, bir anda ortaya çıkan tek bir buluşun değil; yıllar süren eğitim, tekrar, başarısızlık, düzeltme ve yeniden denemenin sonucuydu. Onun bilim yolculuğu, büyük başarıların çoğu zaman doğru cevabı hemen bulmaktan değil, cevaba ulaşana kadar doğru soruyu kararlılıkla takip etmekten doğduğunu gösterir."
      ],
      "content": "Aziz Sancar, 8 Eylül 1946’da Mardin’in Savur ilçesinde, sekiz çocuklu bir ailenin yedinci çocuğu olarak dünyaya geldi. Anne ve babası örgün eğitim görmemişti; buna rağmen çocuklarının öğrenmesine büyük önem veriyordu. Sancar, çocukluk yıllarında ailesine bahçe işlerinde yardım etti, okul takımında kalecilik yaptı ve küçük yaşlardan itibaren bilime ilgi duydu. İlk ve ortaöğrenimini Mardin’de tamamladıktan sonra İstanbul Üniversitesi Tıp Fakültesine girdi. Mezuniyetinin ardından bir süre Savur’da hekimlik yapması, ona yalnızca insan vücudunu değil, bilginin insan yaşamındaki değerini de yakından görme fırsatı verdi.\n\nBilimsel araştırma yapma isteği onu Amerika Birleşik Devletleri’ne götürdü. Ancak bu yolculuk başlangıçta beklediği gibi ilerlemedi. İngilizce iletişim kurmakta zorlanması ve yeni çevresine uyum sağlayamaması nedeniyle Johns Hopkins Üniversitesindeki ilk girişimini yarıda bırakarak Türkiye’ye döndü. Bir süre sonra dilini geliştirip daha hazırlıklı biçimde yeniden Amerika’ya gitti ve 1973’te Teksas Üniversitesinin Dallas’taki programına kabul edildi. Burada, ışığın zarar görmüş DNA’nın onarılmasına nasıl yardımcı olduğunu araştıran Claud Rupert’ın laboratuvarında çalışmaya başladı.\n\nSancar’ın önündeki önemli sorunlardan biri, fotoliyaz adı verilen onarım enziminin yeterli miktarda elde edilememesiydi. Çözüm için önce ilgili gende bozukluk bulunan özel bir bakteri geliştirmesi gerekiyordu. Tasarladığı deneyi altı ay boyunca günde bir ya da iki kez tekrarlamasına rağmen uzun süre sonuç alamadı. Üstelik bir çalışma arkadaşı, laboratuvar araştırmasına uygun olmadığını söyleyerek hekimliğe dönmesini önerdi. Sancar çalışmayı bırakmadı; farklı alanlardan topladığı bilgileri bir araya getirerek deney yöntemini geliştirdi ve sonunda gerekli bakteriyi elde etti. 1975’te fotoliyazla ilgili geni kopyalamayı başardı. Bu sonuç, yalnızca araştırmasını ilerletmedi; başarısızlıklar karşısında yöntem değiştirmenin ve sabırlı olmanın bilimsel çalışmanın bir parçası olduğunu da gösterdi.\n\nSonraki yıllarda DNA’nın ultraviyole ışınlarıyla zarar gören bölümlerinin hücre tarafından nasıl kesilip çıkarıldığını ve yeniden onarıldığını ayrıntılı biçimde haritalandırdı. DNA, canlıların kalıtsal bilgisini taşır fakat güneş ışınları, kimyasal maddeler ve hücre bölünmesi sırasında oluşan hatalar nedeniyle sürekli zarar görebilir. Onarım sistemleri çalışmadığında bu hasarlar birikebilir ve bazı hastalıkların ortaya çıkmasına zemin hazırlayabilir. Sancar’ın çalışmaları, hücrelerin genetik bilgiyi nasıl koruduğunu anlamamıza ve kanser araştırmalarına temel oluşturan süreçlerin açıklanmasına katkı sağladı.\n\nAziz Sancar, DNA onarımı konusundaki çalışmaları nedeniyle Tomas Lindahl ve Paul Modrich ile birlikte 2015 Nobel Kimya Ödülü’ne layık görüldü. Ancak bu ödül, bir anda ortaya çıkan tek bir buluşun değil; yıllar süren eğitim, tekrar, başarısızlık, düzeltme ve yeniden denemenin sonucuydu. Onun bilim yolculuğu, büyük başarıların çoğu zaman doğru cevabı hemen bulmaktan değil, cevaba ulaşana kadar doğru soruyu kararlılıkla takip etmekten doğduğunu gösterir.",
      "wordCount": 381,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin ana düşüncesi aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Bilimsel başarıya yalnızca iyi eğitim kurumlarında çalışan kişiler ulaşabilir."
            },
            {
              "key": "B",
              "text": "Aziz Sancar’ın başarısı, uzun süreli emek ve bilimsel merakla gelişen bir sürecin sonucudur."
            },
            {
              "key": "C",
              "text": "Tıp eğitimi alan bilim insanları yalnızca insan hastalıklarını araştırmalıdır."
            },
            {
              "key": "D",
              "text": "Bilimsel araştırmalarda başarılı olmak için ilk denemede doğru sonucu almak gerekir."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Aziz Sancar’ın Johns Hopkins Üniversitesindeki ilk çalışmasını yarıda bırakmasının temel nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Hekimlik mesleğini bilimsel araştırmalardan daha önemli görmesi"
            },
            {
              "key": "B",
              "text": "Araştırma konusunun kendi eğitimiyle ilgisiz olduğunu düşünmesi"
            },
            {
              "key": "C",
              "text": "İletişim kurmakta ve yeni çevresine uyum sağlamakta zorlanması"
            },
            {
              "key": "D",
              "text": "Teksas Üniversitesinden daha iyi bir çalışma teklifi alması"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Aziz Sancar fotoliyazla ilgili geni hangi yılda kopyalamayı başarmıştır?",
          "options": [
            {
              "key": "A",
              "text": "1971"
            },
            {
              "key": "B",
              "text": "1973"
            },
            {
              "key": "C",
              "text": "1975"
            },
            {
              "key": "D",
              "text": "1977"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q4",
          "question": "Sancar’ın altı ay boyunca sonuç alamadığı deneyi sürdürmesiyle ilgili aşağıdakilerden hangisi söylenebilir?",
          "options": [
            {
              "key": "A",
              "text": "Aynı yöntemi hiç değiştirmeden uygulamanın her araştırmada yeterli olduğunu göstermiştir."
            },
            {
              "key": "B",
              "text": "Bilimsel çalışmalarda başarısızlığın araştırmanın tamamen sona ermesi anlamına gelmediğini göstermiştir."
            },
            {
              "key": "C",
              "text": "Deney sonuçlarının yalnızca araştırmacının doğal yeteneğine bağlı olduğunu kanıtlamıştır."
            },
            {
              "key": "D",
              "text": "Bilimsel sorunların farklı alanlardaki bilgilerden yararlanılmadan çözülebileceğini göstermiştir."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "Nobel Ödülü’nün metinde “bir anda ortaya çıkan tek bir buluşun sonucu” olarak görülmemesinin nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Ödülün üç farklı bilim insanı arasında paylaştırılmış olması"
            },
            {
              "key": "B",
              "text": "Sancar’ın Nobel Ödülü’nden önce hekimlik yapmış olması"
            },
            {
              "key": "C",
              "text": "DNA onarımının bilim insanları tarafından daha önce bilinmemesi"
            },
            {
              "key": "D",
              "text": "Ödüle ulaşan çalışmaların uzun yıllar süren araştırma ve denemelere dayanması"
            }
          ],
          "correctAnswer": "D"
        }
      ]
    },
    {
      "id": "grade-7-8-text-03",
      "grade": "7-8",
      "number": 3,
      "title": "ROSETTA TAŞI ESKİ MISIR YAZISININ ÇÖZÜLMESİNİ NASIL SAĞLADI?",
      "paragraphs": [
        "Rosetta Taşı, koyu renkli granodiyoritten yapılmış kırık bir yazıt parçasıdır. Üzerindeki metin, MÖ 196 yılında Mısır’daki rahiplerden oluşan bir kurul tarafından hazırlanmış bir kararnamedir. Kararnamede genç hükümdar V. Ptolemaios’a verilen onurlar ve kralın ülke için yaptığı kabul edilen işler anlatılır. Metnin içeriği tek başına olağanüstü değildir. Taşı eşsiz kılan, aynı kararnamenin hiyeroglif, demotik ve Eski Yunanca olmak üzere üç farklı yazı sistemiyle kaydedilmiş olmasıdır. Hiyeroglifler dinî ve resmî metinlerde, demotik yazı günlük işlerde, Yunanca ise yönetim çevrelerinde kullanılıyordu.",
        "Taş, 1799 yılında Fransız askerlerinin Mısır’ın Reşit şehri yakınlarındaki bir kalede çalışma yaptığı sırada bulundu. Üzerindeki yazıların birbirinden farklı olduğu kısa sürede fark edildi. O dönemde bilim insanları Eski Yunancayı okuyabiliyor fakat Mısır hiyerogliflerini anlayamıyordu. Bu nedenle Yunanca bölüm, bilinmeyen yazıları çözmek için önemli bir karşılaştırma noktası oluşturdu. Araştırmacılar üç bölümün de aynı kararnameyi aktardığını anlayınca kişi adlarını, unvanları ve sık tekrarlanan ifadeleri eşleştirmeye başladılar.",
        "Ancak çözüm, tek bir kişinin bir anda ulaştığı parlak bir sonuç değildi. İngiliz bilim insanı Thomas Young, özellikle kraliyet adlarının çevresine çizilen ve kartuş adı verilen şekilleri inceleyerek bazı hiyerogliflerin ses değerleri taşıdığını gösterdi. Örneğin Yunanca bölümdeki “Ptolemaios” adını, hiyeroglif bölümündeki işaretlerle karşılaştırdı. Böylece hiyerogliflerin yalnızca nesneleri ve düşünceleri anlatan resimlerden oluşmadığı anlaşılmaya başladı.",
        "Fransız dil bilimci Jean-François Champollion ise Eski Mısır dilinin son dönem biçimi olan Kıptice üzerindeki bilgisinden yararlandı. İşaretlerin bazen sesleri, bazen sözcükleri veya kavramları temsil edebildiğini fark etti. Champollion, farklı yazıtlar üzerindeki kraliyet adlarını da karşılaştırarak geliştirdiği sistemi sınadı ve ulaştığı sonuçları 1822 yılında bilim dünyasına açıkladı. Bu çalışma, hiyerogliflerin tek tip işaretlerden değil, ses ve anlam bildiren unsurların birlikte kullanıldığı karmaşık bir sistemden oluştuğunu ortaya koydu.",
        "Rosetta Taşı, bütün hiyeroglifleri tek başına açıklayan hazır bir sözlük değildi. Asıl önemi, bilinen bir dildeki metinle bilinmeyen yazıları yan yana getirmesiydi. Araştırmacılar bu anahtarı başka yazıtlar, dil bilgisi kuralları ve yıllarca süren karşılaştırmalarla birlikte kullandı. Böylece tapınak duvarlarındaki, mezarlardaki ve papirüslerdeki metinler okunmaya başladı. Eski Mısırlıların yönetim biçimleri, inançları, günlük yaşamları ve olaylara bakışları hakkında daha ayrıntılı bilgilere ulaşıldı.",
        "Rosetta Taşı’nın öyküsü, geçmişi anlamanın yalnızca önemli bir eser bulmakla tamamlanmadığını gösterir. Bilinen ile bilinmeyen arasında bağlantı kurmak, farklı araştırmacıların çalışmalarından yararlanmak ve ulaşılan sonuçları başka örneklerle sınamak gerekiyordu. Binlerce yıl sessiz kalan bir yazının yeniden okunmasını sağlayan şey, taşın varlığı kadar insanların sabırlı ve ortak çalışmasıydı."
      ],
      "content": "Rosetta Taşı, koyu renkli granodiyoritten yapılmış kırık bir yazıt parçasıdır. Üzerindeki metin, MÖ 196 yılında Mısır’daki rahiplerden oluşan bir kurul tarafından hazırlanmış bir kararnamedir. Kararnamede genç hükümdar V. Ptolemaios’a verilen onurlar ve kralın ülke için yaptığı kabul edilen işler anlatılır. Metnin içeriği tek başına olağanüstü değildir. Taşı eşsiz kılan, aynı kararnamenin hiyeroglif, demotik ve Eski Yunanca olmak üzere üç farklı yazı sistemiyle kaydedilmiş olmasıdır. Hiyeroglifler dinî ve resmî metinlerde, demotik yazı günlük işlerde, Yunanca ise yönetim çevrelerinde kullanılıyordu.\n\nTaş, 1799 yılında Fransız askerlerinin Mısır’ın Reşit şehri yakınlarındaki bir kalede çalışma yaptığı sırada bulundu. Üzerindeki yazıların birbirinden farklı olduğu kısa sürede fark edildi. O dönemde bilim insanları Eski Yunancayı okuyabiliyor fakat Mısır hiyerogliflerini anlayamıyordu. Bu nedenle Yunanca bölüm, bilinmeyen yazıları çözmek için önemli bir karşılaştırma noktası oluşturdu. Araştırmacılar üç bölümün de aynı kararnameyi aktardığını anlayınca kişi adlarını, unvanları ve sık tekrarlanan ifadeleri eşleştirmeye başladılar.\n\nAncak çözüm, tek bir kişinin bir anda ulaştığı parlak bir sonuç değildi. İngiliz bilim insanı Thomas Young, özellikle kraliyet adlarının çevresine çizilen ve kartuş adı verilen şekilleri inceleyerek bazı hiyerogliflerin ses değerleri taşıdığını gösterdi. Örneğin Yunanca bölümdeki “Ptolemaios” adını, hiyeroglif bölümündeki işaretlerle karşılaştırdı. Böylece hiyerogliflerin yalnızca nesneleri ve düşünceleri anlatan resimlerden oluşmadığı anlaşılmaya başladı.\n\nFransız dil bilimci Jean-François Champollion ise Eski Mısır dilinin son dönem biçimi olan Kıptice üzerindeki bilgisinden yararlandı. İşaretlerin bazen sesleri, bazen sözcükleri veya kavramları temsil edebildiğini fark etti. Champollion, farklı yazıtlar üzerindeki kraliyet adlarını da karşılaştırarak geliştirdiği sistemi sınadı ve ulaştığı sonuçları 1822 yılında bilim dünyasına açıkladı. Bu çalışma, hiyerogliflerin tek tip işaretlerden değil, ses ve anlam bildiren unsurların birlikte kullanıldığı karmaşık bir sistemden oluştuğunu ortaya koydu.\n\nRosetta Taşı, bütün hiyeroglifleri tek başına açıklayan hazır bir sözlük değildi. Asıl önemi, bilinen bir dildeki metinle bilinmeyen yazıları yan yana getirmesiydi. Araştırmacılar bu anahtarı başka yazıtlar, dil bilgisi kuralları ve yıllarca süren karşılaştırmalarla birlikte kullandı. Böylece tapınak duvarlarındaki, mezarlardaki ve papirüslerdeki metinler okunmaya başladı. Eski Mısırlıların yönetim biçimleri, inançları, günlük yaşamları ve olaylara bakışları hakkında daha ayrıntılı bilgilere ulaşıldı.\n\nRosetta Taşı’nın öyküsü, geçmişi anlamanın yalnızca önemli bir eser bulmakla tamamlanmadığını gösterir. Bilinen ile bilinmeyen arasında bağlantı kurmak, farklı araştırmacıların çalışmalarından yararlanmak ve ulaşılan sonuçları başka örneklerle sınamak gerekiyordu. Binlerce yıl sessiz kalan bir yazının yeniden okunmasını sağlayan şey, taşın varlığı kadar insanların sabırlı ve ortak çalışmasıydı.",
      "wordCount": 371,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Eski Mısır’da kullanılan bütün yazı araçlarını tanıtmak"
            },
            {
              "key": "B",
              "text": "Rosetta Taşı’nın bulunmasını ve hiyerogliflerin çözümündeki rolünü açıklamak"
            },
            {
              "key": "C",
              "text": "V. Ptolemaios dönemindeki yönetim biçimini ayrıntılı olarak incelemek"
            },
            {
              "key": "D",
              "text": "Fransız ve İngiliz bilim insanlarının eğitim hayatlarını karşılaştırmak"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Rosetta Taşı’nın Eski Yunanca yazılmış bölümünün araştırmacılar için önemli olmasının nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Yunanca bölümün diğer iki bölümden daha uzun olması"
            },
            {
              "key": "B",
              "text": "Kararnamenin yalnızca Yunanca bölümünde eksiksiz bulunması"
            },
            {
              "key": "C",
              "text": "Araştırmacıların Yunancayı okuyarak diğer yazılarla karşılaştırma yapabilmesi"
            },
            {
              "key": "D",
              "text": "Yunanca işaretlerin Mısır hiyeroglifleriyle tamamen aynı olması"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Rosetta Taşı hangi yılda bulunmuştur?",
          "options": [
            {
              "key": "A",
              "text": "1799"
            },
            {
              "key": "B",
              "text": "1802"
            },
            {
              "key": "C",
              "text": "1814"
            },
            {
              "key": "D",
              "text": "1822"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q4",
          "question": "Aynı kararnamenin üç farklı yazı sistemiyle kaydedilmiş olması çözüm çalışmalarını nasıl kolaylaştırmıştır?",
          "options": [
            {
              "key": "A",
              "text": "Her yazı sisteminin farklı bir olayı anlatmasını sağlamıştır."
            },
            {
              "key": "B",
              "text": "Bilinen bölümdeki sözcüklerin bilinmeyen işaretlerle eşleştirilmesine imkân vermiştir."
            },
            {
              "key": "C",
              "text": "Hiyeroglif bölümünün okunmasına gerek kalmadan bütün Mısır tarihi öğrenilmiştir."
            },
            {
              "key": "D",
              "text": "Araştırmacıların yalnızca yazıların şekillerini karşılaştırması yeterli olmuştur."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "Metne göre Thomas Young ve Jean-François Champollion’un çalışmalarının ortak yönü aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Hiyerogliflerin yalnızca düşünceleri gösteren resimler olduğunu savunmaları"
            },
            {
              "key": "B",
              "text": "Çözüm için yalnızca Yunanca bölümdeki tarihleri incelemeleri"
            },
            {
              "key": "C",
              "text": "Rosetta Taşı’nı bulan askerî birliğin içinde görev yapmaları"
            },
            {
              "key": "D",
              "text": "Hiyeroglif işaretleri ile dildeki sesler arasında bağlantı kurmaları"
            }
          ],
          "correctAnswer": "D"
        }
      ]
    },
    {
      "id": "grade-7-8-text-04",
      "grade": "7-8",
      "number": 4,
      "title": "NAİM SÜLEYMANOĞLU’NUN SINIRLARI AŞAN MÜCADELESİ",
      "paragraphs": [
        "Naim Süleymanoğlu, 23 Ocak 1967’de Bulgaristan’ın Ptichar köyünde Türk bir ailenin çocuğu olarak dünyaya geldi. Henüz genç yaşlarında halterde dikkat çeken dereceler elde ederek uluslararası yarışmalarda Bulgaristan adına mücadele etmeye başladı. Boyu yalnızca 1,47 metre olmasına rağmen kendi ağırlığının birkaç katını kaldırabilmesi, ona daha sonra “Cep Herkülü” lakabının verilmesini sağladı. Fakat onun hayatındaki mücadele yalnızca kaldırdığı ağırlıklarla sınırlı değildi.",
        "1980’li yıllarda Bulgaristan’daki Türk azınlık, kendi dilini ve kimliğini yaşatma konusunda ciddi baskılarla karşılaşıyordu. Naim’in adı da yetkililer tarafından isteği dışında değiştirilmişti. Dünyanın en başarılı sporcularından biri olmasına rağmen kendi adıyla yarışamaması ve toplumunun yaşadığı sorunlar karşısında sessiz kalmak istememesi, hayatının yönünü değiştirecek bir karar almasına neden oldu. 1986’da Bulgaristan millî takımıyla Avustralya’nın Melbourne şehrinde bulunduğu sırada ekipten ayrıldı ve Türkiye’ye sığındı. Bu karar, yalnızca ülke değiştirmek anlamına gelmiyordu; ailesinden, alıştığı düzenden ve spor yaşamını yöneten sistemden ayrılmayı da göze alması gerekiyordu.",
        "Türkiye adına yarışabilmesi için uluslararası işlemlerin tamamlanmasının ardından Naim Süleymanoğlu, 1988 Seul Olimpiyatları’na katıldı. 60 kilogram sıkletinde koparmada 152,5 kilogram, silkmede 190 kilogram kaldırdı ve toplamda 342,5 kilograma ulaştı. Bu üç sonuç da dünya rekoruydu. Üstelik elde ettiği toplam derece, bir üst ağırlık sınıfında altın madalya kazanan sporcunun derecesinden de yüksekti. Süleymanoğlu’nun başarısı yalnızca fiziksel gücünden kaynaklanmıyordu. Halterde birkaç saniye süren bir kaldırışın arkasında yıllarca tekrarlanan teknik çalışmalar, doğru zamanlama, denge ve yarışma baskısını yönetme becerisi bulunuyordu.",
        "Seul’de kazandığı altın madalyanın ardından 1992 Barselona ve 1996 Atlanta Olimpiyatları’nda da birinci oldu. Böylece üç farklı Olimpiyat Oyunları’nda altın madalya kazanan ilk halterci olarak tarihe geçti. Kariyeri boyunca yedi dünya şampiyonluğu elde etti ve 46 dünya rekoruna imza attı. Ancak bu başarıların değeri yalnızca sayıların büyüklüğünde değildi. O, farklı bir ülkeye yerleşip yeni koşullara uyum sağlarken spor yaşamını kesintiye uğratmadan sürdürebilmişti.",
        "Naim Süleymanoğlu’nun hikâyesinde spor, kişisel başarı ile toplumsal sorumluluğun birleştiği bir alan hâline geldi. Yarışma platformuna çıktığında yalnızca madalya kazanmak için değil, yaşadıklarını ve temsil ettiği insanların sesini dünyaya duyurmak için de mücadele ediyordu. Kendisinden daha ağır rakiplerle değil, aynı zamanda baskı, belirsizlik ve yüksek beklentilerle karşı karşıyaydı. Onu unutulmaz kılan, kaldırdığı ağırlıkların yanında bütün bu koşullar altında yönünü kaybetmeden çalışmaya devam edebilmesiydi."
      ],
      "content": "Naim Süleymanoğlu, 23 Ocak 1967’de Bulgaristan’ın Ptichar köyünde Türk bir ailenin çocuğu olarak dünyaya geldi. Henüz genç yaşlarında halterde dikkat çeken dereceler elde ederek uluslararası yarışmalarda Bulgaristan adına mücadele etmeye başladı. Boyu yalnızca 1,47 metre olmasına rağmen kendi ağırlığının birkaç katını kaldırabilmesi, ona daha sonra “Cep Herkülü” lakabının verilmesini sağladı. Fakat onun hayatındaki mücadele yalnızca kaldırdığı ağırlıklarla sınırlı değildi.\n\n1980’li yıllarda Bulgaristan’daki Türk azınlık, kendi dilini ve kimliğini yaşatma konusunda ciddi baskılarla karşılaşıyordu. Naim’in adı da yetkililer tarafından isteği dışında değiştirilmişti. Dünyanın en başarılı sporcularından biri olmasına rağmen kendi adıyla yarışamaması ve toplumunun yaşadığı sorunlar karşısında sessiz kalmak istememesi, hayatının yönünü değiştirecek bir karar almasına neden oldu. 1986’da Bulgaristan millî takımıyla Avustralya’nın Melbourne şehrinde bulunduğu sırada ekipten ayrıldı ve Türkiye’ye sığındı. Bu karar, yalnızca ülke değiştirmek anlamına gelmiyordu; ailesinden, alıştığı düzenden ve spor yaşamını yöneten sistemden ayrılmayı da göze alması gerekiyordu.\n\nTürkiye adına yarışabilmesi için uluslararası işlemlerin tamamlanmasının ardından Naim Süleymanoğlu, 1988 Seul Olimpiyatları’na katıldı. 60 kilogram sıkletinde koparmada 152,5 kilogram, silkmede 190 kilogram kaldırdı ve toplamda 342,5 kilograma ulaştı. Bu üç sonuç da dünya rekoruydu. Üstelik elde ettiği toplam derece, bir üst ağırlık sınıfında altın madalya kazanan sporcunun derecesinden de yüksekti. Süleymanoğlu’nun başarısı yalnızca fiziksel gücünden kaynaklanmıyordu. Halterde birkaç saniye süren bir kaldırışın arkasında yıllarca tekrarlanan teknik çalışmalar, doğru zamanlama, denge ve yarışma baskısını yönetme becerisi bulunuyordu.\n\nSeul’de kazandığı altın madalyanın ardından 1992 Barselona ve 1996 Atlanta Olimpiyatları’nda da birinci oldu. Böylece üç farklı Olimpiyat Oyunları’nda altın madalya kazanan ilk halterci olarak tarihe geçti. Kariyeri boyunca yedi dünya şampiyonluğu elde etti ve 46 dünya rekoruna imza attı. Ancak bu başarıların değeri yalnızca sayıların büyüklüğünde değildi. O, farklı bir ülkeye yerleşip yeni koşullara uyum sağlarken spor yaşamını kesintiye uğratmadan sürdürebilmişti.\n\nNaim Süleymanoğlu’nun hikâyesinde spor, kişisel başarı ile toplumsal sorumluluğun birleştiği bir alan hâline geldi. Yarışma platformuna çıktığında yalnızca madalya kazanmak için değil, yaşadıklarını ve temsil ettiği insanların sesini dünyaya duyurmak için de mücadele ediyordu. Kendisinden daha ağır rakiplerle değil, aynı zamanda baskı, belirsizlik ve yüksek beklentilerle karşı karşıyaydı. Onu unutulmaz kılan, kaldırdığı ağırlıkların yanında bütün bu koşullar altında yönünü kaybetmeden çalışmaya devam edebilmesiydi.",
      "wordCount": 346,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin ana düşüncesi aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Halterde başarılı olmak için sporcunun rakiplerinden daha uzun boylu olması gerekir."
            },
            {
              "key": "B",
              "text": "Naim Süleymanoğlu’nun başarısı, sportif gücün yanında kimlik ve yaşam mücadelesini de içermektedir."
            },
            {
              "key": "C",
              "text": "Olimpiyatlarda madalya kazanan sporcuların tamamı farklı ülkeler adına yarışmıştır."
            },
            {
              "key": "D",
              "text": "Sporcuların toplumsal olaylarla ilgilenmesi yarışma başarılarını mutlaka azaltır."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Naim Süleymanoğlu’nun 1986’da Türkiye’ye sığınma kararı almasında aşağıdakilerden hangisi etkili olmuştur?",
          "options": [
            {
              "key": "A",
              "text": "Bulgaristan millî takımında yarışmasına izin verilmemesi"
            },
            {
              "key": "B",
              "text": "Halter sporunu bırakıp farklı bir meslek seçmek istemesi"
            },
            {
              "key": "C",
              "text": "Türk azınlığa yönelik baskılar ve kendi kimliğini özgürce yaşama isteği"
            },
            {
              "key": "D",
              "text": "Türkiye’deki antrenman tesislerinin daha yeni olduğunu düşünmesi"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Naim Süleymanoğlu, 1988 Seul Olimpiyatları’nda toplam kaç kilogram kaldırmıştır?",
          "options": [
            {
              "key": "A",
              "text": "302,5 kilogram"
            },
            {
              "key": "B",
              "text": "322,5 kilogram"
            },
            {
              "key": "C",
              "text": "342,5 kilogram"
            },
            {
              "key": "D",
              "text": "362,5 kilogram"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q4",
          "question": "Süleymanoğlu’nun 1988’deki derecesinin bir üst ağırlık sınıfının şampiyonundan da yüksek olması neyi göstermektedir?",
          "options": [
            {
              "key": "A",
              "text": "Yarışmalarda ağırlık sınıflarının dikkate alınmadığını"
            },
            {
              "key": "B",
              "text": "Elde ettiği performansın kendi sıkletinin ötesinde olağanüstü olduğunu"
            },
            {
              "key": "C",
              "text": "Üst ağırlık sınıfındaki sporcuların yarışmayı tamamlayamadığını"
            },
            {
              "key": "D",
              "text": "Halterde yalnızca sporcunun vücut ağırlığının önemli olduğunu"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "Metne göre Naim Süleymanoğlu’nun başarısını yalnızca fiziksel güçle açıklamak neden yeterli değildir?",
          "options": [
            {
              "key": "A",
              "text": "Başarısında teknik çalışma, denge ve baskıyı yönetme becerisi de etkili olduğu için"
            },
            {
              "key": "B",
              "text": "Yarışmalarda kaldırdığı ağırlıklar resmî olarak kaydedilmediği için"
            },
            {
              "key": "C",
              "text": "Olimpiyatlarda kendisinden daha hafif sporcularla yarıştığı için"
            },
            {
              "key": "D",
              "text": "Spor yaşamı boyunca yalnızca tek bir antrenörle çalıştığı için"
            }
          ],
          "correctAnswer": "A"
        }
      ]
    },
    {
      "id": "grade-7-8-text-05",
      "grade": "7-8",
      "number": 5,
      "title": "YAPAY ZEKÂ NASIL ÖĞRENİR VE HATA YAPAR?",
      "paragraphs": [
        "Bir yapay zekâ sistemi, insanlar gibi ders dinleyerek veya yaşadığı olayları düşünerek öğrenmez. Makine öğrenmesi adı verilen yöntemde sisteme çok sayıda örnek verilir ve bu örneklerde tekrar eden özellikleri belirlemesi sağlanır. Örneğin kedi ve köpek fotoğraflarını ayırt edecek bir sistem geliştirilirken bilgisayara hangi görüntülerin kediye, hangilerinin köpeğe ait olduğu gösterilebilir. Sistem; kulak biçimi, yüz yapısı, tüy görünümü ve gövdedeki çizgiler gibi birçok ayrıntı arasındaki ilişkileri inceler. Daha sonra daha önce görmediği bir fotoğrafın hangi gruba ait olduğunu tahmin etmeye çalışır.",
        "Ancak sistemin yaptığı işlem, “kedi” kavramını bir insan gibi anlamak değildir. Yapay zekâ, eğitim sırasında karşılaştığı örneklerdeki sayısal örüntüleri kullanır. Bir görüntü bilgisayara renk ve parlaklık değerlerinden oluşan sayılar hâlinde aktarılır. Model, bu sayılar ile kendisine verilen doğru cevaplar arasında bağlantı kurmaya çalışır. Eğitim sırasında yaptığı tahmin ile gerçek cevap arasındaki fark hesaplanır. Model, bu hatayı azaltacak biçimde kendi içindeki bağlantıları defalarca düzenler.",
        "Bir modelin başarısını değerlendirmek için veriler genellikle farklı bölümlere ayrılır. Eğitim verileri modelin örüntüleri öğrenmesinde, doğrulama verileri geliştirme sırasında yapılan ayarların kontrolünde, test verileri ise modelin daha önce karşılaşmadığı örneklerdeki başarısını ölçmekte kullanılır. Model yalnızca eğitim örneklerini ezberler ve yeni örneklerde başarısız olursa buna aşırı öğrenme denir. Bu nedenle bir sistemin eğitim verilerinde yüksek başarı göstermesi, gerçek yaşamda da aynı ölçüde güvenilir olacağını kanıtlamaz.",
        "Yapay zekâ araştırmalarında büyük veri kümelerinden yararlanılabilir. Görüntü tanıma çalışmalarında kullanılan ImageNet veri tabanında 14.197.122 görüntü bulunmaktadır. Çok sayıda örnek modele farklı durumları gösterme imkânı verse de yalnızca veri miktarının fazla olması yeterli değildir. Görüntülerin doğru etiketlenmesi, çeşitlilik içermesi ve gerçek yaşamı temsil etmesi de gerekir.",
        "Örneğin eğitim verilerindeki bütün kurt fotoğrafları karlı alanlarda, köpek fotoğrafları ise evlerin içinde çekilmişse model hayvanların özellikleri yerine arka plandaki karı ayırt etmeyi öğrenebilir. Bu durumda karlı bir alanda duran köpeği kurt olarak sınıflandırması mümkündür. Benzer biçimde bazı insan grupları eğitim verilerinde yeterince temsil edilmezse sistem bu gruplarda daha fazla hata yapabilir. Verilerin seçimi ve etiketlenmesi insanlar tarafından gerçekleştirildiği için toplumdaki eksiklikler veya önyargılar modele de taşınabilir.",
        "Bir yapay zekâ sisteminin cevabını yüksek güven oranıyla vermesi de cevabın mutlaka doğru olduğu anlamına gelmez. Sistem, karşısındaki durumu eğitim sırasında gördüğü örneklere göre değerlendirir. Eksik veri, yanlış etiketler, alışılmadık bir durum veya hatalı kurulan bir model yanlış sonuçlara yol açabilir. Bu nedenle yapay zekâ sistemleri yalnızca genel başarı oranlarıyla değil, farklı koşullarda ve farklı kullanıcı gruplarında gösterdikleri sonuçlarla da sınanmalıdır. Yapay zekânın güçlü bir araç olması, onun her kararının sorgulanmadan kabul edilmesi gerektiği anlamına gelmez."
      ],
      "content": "Bir yapay zekâ sistemi, insanlar gibi ders dinleyerek veya yaşadığı olayları düşünerek öğrenmez. Makine öğrenmesi adı verilen yöntemde sisteme çok sayıda örnek verilir ve bu örneklerde tekrar eden özellikleri belirlemesi sağlanır. Örneğin kedi ve köpek fotoğraflarını ayırt edecek bir sistem geliştirilirken bilgisayara hangi görüntülerin kediye, hangilerinin köpeğe ait olduğu gösterilebilir. Sistem; kulak biçimi, yüz yapısı, tüy görünümü ve gövdedeki çizgiler gibi birçok ayrıntı arasındaki ilişkileri inceler. Daha sonra daha önce görmediği bir fotoğrafın hangi gruba ait olduğunu tahmin etmeye çalışır.\n\nAncak sistemin yaptığı işlem, “kedi” kavramını bir insan gibi anlamak değildir. Yapay zekâ, eğitim sırasında karşılaştığı örneklerdeki sayısal örüntüleri kullanır. Bir görüntü bilgisayara renk ve parlaklık değerlerinden oluşan sayılar hâlinde aktarılır. Model, bu sayılar ile kendisine verilen doğru cevaplar arasında bağlantı kurmaya çalışır. Eğitim sırasında yaptığı tahmin ile gerçek cevap arasındaki fark hesaplanır. Model, bu hatayı azaltacak biçimde kendi içindeki bağlantıları defalarca düzenler.\n\nBir modelin başarısını değerlendirmek için veriler genellikle farklı bölümlere ayrılır. Eğitim verileri modelin örüntüleri öğrenmesinde, doğrulama verileri geliştirme sırasında yapılan ayarların kontrolünde, test verileri ise modelin daha önce karşılaşmadığı örneklerdeki başarısını ölçmekte kullanılır. Model yalnızca eğitim örneklerini ezberler ve yeni örneklerde başarısız olursa buna aşırı öğrenme denir. Bu nedenle bir sistemin eğitim verilerinde yüksek başarı göstermesi, gerçek yaşamda da aynı ölçüde güvenilir olacağını kanıtlamaz.\n\nYapay zekâ araştırmalarında büyük veri kümelerinden yararlanılabilir. Görüntü tanıma çalışmalarında kullanılan ImageNet veri tabanında 14.197.122 görüntü bulunmaktadır. Çok sayıda örnek modele farklı durumları gösterme imkânı verse de yalnızca veri miktarının fazla olması yeterli değildir. Görüntülerin doğru etiketlenmesi, çeşitlilik içermesi ve gerçek yaşamı temsil etmesi de gerekir.\n\nÖrneğin eğitim verilerindeki bütün kurt fotoğrafları karlı alanlarda, köpek fotoğrafları ise evlerin içinde çekilmişse model hayvanların özellikleri yerine arka plandaki karı ayırt etmeyi öğrenebilir. Bu durumda karlı bir alanda duran köpeği kurt olarak sınıflandırması mümkündür. Benzer biçimde bazı insan grupları eğitim verilerinde yeterince temsil edilmezse sistem bu gruplarda daha fazla hata yapabilir. Verilerin seçimi ve etiketlenmesi insanlar tarafından gerçekleştirildiği için toplumdaki eksiklikler veya önyargılar modele de taşınabilir.\n\nBir yapay zekâ sisteminin cevabını yüksek güven oranıyla vermesi de cevabın mutlaka doğru olduğu anlamına gelmez. Sistem, karşısındaki durumu eğitim sırasında gördüğü örneklere göre değerlendirir. Eksik veri, yanlış etiketler, alışılmadık bir durum veya hatalı kurulan bir model yanlış sonuçlara yol açabilir. Bu nedenle yapay zekâ sistemleri yalnızca genel başarı oranlarıyla değil, farklı koşullarda ve farklı kullanıcı gruplarında gösterdikleri sonuçlarla da sınanmalıdır. Yapay zekânın güçlü bir araç olması, onun her kararının sorgulanmadan kabul edilmesi gerektiği anlamına gelmez.",
      "wordCount": 398,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Yapay zekânın örneklerden nasıl öğrendiğini ve neden hata yapabildiğini açıklamak"
            },
            {
              "key": "B",
              "text": "Bilgisayarların görüntüleri hangi dosya türlerinde sakladığını göstermek"
            },
            {
              "key": "C",
              "text": "Yapay zekâ çalışmalarında kullanılan bütün programları karşılaştırmak"
            },
            {
              "key": "D",
              "text": "İnsan beyninin bilgisayarlardan daha hızlı çalıştığını kanıtlamak"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q2",
          "question": "Test verilerinin kullanılmasının temel amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Modelin eğitim örneklerini daha hızlı ezberlemesini sağlamak"
            },
            {
              "key": "B",
              "text": "Verilerdeki yanlış etiketleri kendiliğinden düzeltmek"
            },
            {
              "key": "C",
              "text": "Modelin daha önce görmediği örneklerdeki başarısını ölçmek"
            },
            {
              "key": "D",
              "text": "Eğitim verilerinin tamamını daha küçük parçalara ayırmak"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Metne göre ImageNet veri tabanında kaç görüntü bulunmaktadır?",
          "options": [
            {
              "key": "A",
              "text": "1.419.712"
            },
            {
              "key": "B",
              "text": "4.197.122"
            },
            {
              "key": "C",
              "text": "12.197.142"
            },
            {
              "key": "D",
              "text": "14.197.122"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q4",
          "question": "Yalnızca karlı alanlardaki kurt fotoğraflarıyla eğitilen bir modelin karlı alandaki köpeği kurt sanması neyi gösterir?",
          "options": [
            {
              "key": "A",
              "text": "Modelin hayvanın özellikleri yerine arka plandaki karı öğrenmiş olabileceğini"
            },
            {
              "key": "B",
              "text": "Köpek ve kurtların bütün fiziksel özelliklerinin tamamen aynı olduğunu"
            },
            {
              "key": "C",
              "text": "Görüntü tanıma sistemlerinin renk bilgilerini kullanamadığını"
            },
            {
              "key": "D",
              "text": "Çok sayıda eğitim örneğinin modelin başarısını mutlaka azalttığını"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q5",
          "question": "Bir yapay zekâ modelinin eğitim verilerinde yüksek başarı göstermesi neden tek başına yeterli değildir?",
          "options": [
            {
              "key": "A",
              "text": "Eğitim verilerinde doğru cevaplar bulunmadığı için"
            },
            {
              "key": "B",
              "text": "Model yeni ve farklı örneklerle karşılaştığında aynı başarıyı gösteremeyebileceği için"
            },
            {
              "key": "C",
              "text": "Test verileri her zaman eğitim verilerinden daha kolay olduğu için"
            },
            {
              "key": "D",
              "text": "Modelin öğrenebilmesi için yalnızca sayısal veriler kullanılması gerektiği için"
            }
          ],
          "correctAnswer": "B"
        }
      ]
    }
  ],
  "lise": [
    {
      "id": "grade-lise-text-01",
      "grade": "lise",
      "number": 1,
      "title": "CANAN DAĞDEVİREN: BİLİMİ İNSAN BEDENİYLE BULUŞTURAN YOLCULUK",
      "paragraphs": [
        "Canan Dağdeviren, 1985 yılında İstanbul’da dünyaya geldi. Bilime ilgisi, yalnızca derslerde başarılı olma isteğinden doğmadı; çevresindeki insanların yaşadığı sağlık sorunlarına çözüm üretme düşüncesiyle güçlendi. Hacettepe Üniversitesi Fizik Mühendisliği Bölümünde öğrenim görürken piezoelektrik malzemeler üzerine okumalar yaptı. Bu malzemeler, bükülme veya baskı gibi mekanik hareketleri elektrik enerjisine dönüştürebiliyordu. Üniversite yıllarında ABD’de çalışan malzeme bilimci John Rogers’ın araştırmalarını okuyunca bir gün onun laboratuvarında çalışma hedefi koydu. Lisans eğitiminden sonra Sabancı Üniversitesinde Malzeme Bilimi ve Mühendisliği alanında yüksek lisans yaptı; ardından Fulbright bursuyla Illinois Üniversitesinde doktora eğitimine başladı.",
        "Dağdeviren’in doktora çalışmalarının merkezinde insan bedenine uyum sağlayabilecek ince, esnek ve bükülebilir elektronik sistemler vardı. Sert cihazların aksine bu teknolojiler kalp, deri veya başka organların kıvrımlı yüzeylerine zarar vermeden yerleştirilebiliyordu. Ekibiyle geliştirdiği piezoelektrik düzenekler kalp, akciğer ve diyaframın doğal hareketlerinden enerji üretebiliyordu. Bu yaklaşımın gelecekte kalp pili gibi tıbbi cihazların pil ömrünü uzatması ve hastaların pil değiştirmek için tekrar ameliyat olma ihtiyacını azaltması amaçlanıyordu. Çalışmaları ona 2014 Illinois İnovasyon Ödülü’nü kazandırdı.",
        "Doktorasını tamamladıktan sonra 2015-2017 yılları arasında Harvard Üniversitesi Society of Fellows bünyesinde genç araştırmacı olarak görev yaptı. Bu dönemde ilaçları doğrudan belirli beyin bölgelerine ulaştırabilen ve sinirsel etkinliği elektriksel olarak düzenleyebilen ince beyin sondaları üzerinde çalıştı. 2017’de MIT Media Lab öğretim kadrosuna katılarak Conformable Decoders adlı araştırma grubunu kurdu. Günümüzde MIT’de kadrolu doçent olarak görev yapan Dağdeviren, insan bedenindeki hareket, basınç ve titreşim gibi fiziksel işaretleri ölçülebilir bilgiye, tedaviye veya kullanılabilir enerjiye dönüştüren teknolojiler geliştiriyor.",
        "Dağdeviren’in araştırmalarının önemli bir bölümü, kişisel deneyimlerden doğan gerçek ihtiyaçlara dayanır. Teyzesini meme kanseri nedeniyle kaybetmesinin ardından hastalığın daha sık ve kolay biçimde izlenmesine yardımcı olabilecek giyilebilir bir ultrason sistemi geliştirmeye yöneldi. Ekibiyle tasarladığı cihaz, sütyene yerleştirilebilen esnek bir parçayla meme dokusunun farklı bölgelerinden görüntü alınmasını amaçlıyor. Böylece yüksek risk grubundaki kişilerin yalnızca yıllık kontroller arasında değil, daha sık aralıklarla izlenebilmesi hedefleniyor.",
        "Canan Dağdeviren’in bilim yolculuğu, önemli bir buluşun çoğu zaman tek bir parlak fikirden değil; iyi belirlenmiş bir sorundan, farklı bilim alanlarını bir araya getirmekten ve uzun süreli denemelerden doğduğunu gösterir. Onun çalışmalarında teknoloji, insan bedeninden uzak ve soğuk bir araç değildir. Tam tersine teknoloji; bedene uyum sağlayan, onun hareketlerinden enerji alan ve sağlık sorunlarını daha erken fark etmeye çalışan bir yardımcıya dönüşür."
      ],
      "content": "Canan Dağdeviren, 1985 yılında İstanbul’da dünyaya geldi. Bilime ilgisi, yalnızca derslerde başarılı olma isteğinden doğmadı; çevresindeki insanların yaşadığı sağlık sorunlarına çözüm üretme düşüncesiyle güçlendi. Hacettepe Üniversitesi Fizik Mühendisliği Bölümünde öğrenim görürken piezoelektrik malzemeler üzerine okumalar yaptı. Bu malzemeler, bükülme veya baskı gibi mekanik hareketleri elektrik enerjisine dönüştürebiliyordu. Üniversite yıllarında ABD’de çalışan malzeme bilimci John Rogers’ın araştırmalarını okuyunca bir gün onun laboratuvarında çalışma hedefi koydu. Lisans eğitiminden sonra Sabancı Üniversitesinde Malzeme Bilimi ve Mühendisliği alanında yüksek lisans yaptı; ardından Fulbright bursuyla Illinois Üniversitesinde doktora eğitimine başladı.\n\nDağdeviren’in doktora çalışmalarının merkezinde insan bedenine uyum sağlayabilecek ince, esnek ve bükülebilir elektronik sistemler vardı. Sert cihazların aksine bu teknolojiler kalp, deri veya başka organların kıvrımlı yüzeylerine zarar vermeden yerleştirilebiliyordu. Ekibiyle geliştirdiği piezoelektrik düzenekler kalp, akciğer ve diyaframın doğal hareketlerinden enerji üretebiliyordu. Bu yaklaşımın gelecekte kalp pili gibi tıbbi cihazların pil ömrünü uzatması ve hastaların pil değiştirmek için tekrar ameliyat olma ihtiyacını azaltması amaçlanıyordu. Çalışmaları ona 2014 Illinois İnovasyon Ödülü’nü kazandırdı.\n\nDoktorasını tamamladıktan sonra 2015-2017 yılları arasında Harvard Üniversitesi Society of Fellows bünyesinde genç araştırmacı olarak görev yaptı. Bu dönemde ilaçları doğrudan belirli beyin bölgelerine ulaştırabilen ve sinirsel etkinliği elektriksel olarak düzenleyebilen ince beyin sondaları üzerinde çalıştı. 2017’de MIT Media Lab öğretim kadrosuna katılarak Conformable Decoders adlı araştırma grubunu kurdu. Günümüzde MIT’de kadrolu doçent olarak görev yapan Dağdeviren, insan bedenindeki hareket, basınç ve titreşim gibi fiziksel işaretleri ölçülebilir bilgiye, tedaviye veya kullanılabilir enerjiye dönüştüren teknolojiler geliştiriyor.\n\nDağdeviren’in araştırmalarının önemli bir bölümü, kişisel deneyimlerden doğan gerçek ihtiyaçlara dayanır. Teyzesini meme kanseri nedeniyle kaybetmesinin ardından hastalığın daha sık ve kolay biçimde izlenmesine yardımcı olabilecek giyilebilir bir ultrason sistemi geliştirmeye yöneldi. Ekibiyle tasarladığı cihaz, sütyene yerleştirilebilen esnek bir parçayla meme dokusunun farklı bölgelerinden görüntü alınmasını amaçlıyor. Böylece yüksek risk grubundaki kişilerin yalnızca yıllık kontroller arasında değil, daha sık aralıklarla izlenebilmesi hedefleniyor.\n\nCanan Dağdeviren’in bilim yolculuğu, önemli bir buluşun çoğu zaman tek bir parlak fikirden değil; iyi belirlenmiş bir sorundan, farklı bilim alanlarını bir araya getirmekten ve uzun süreli denemelerden doğduğunu gösterir. Onun çalışmalarında teknoloji, insan bedeninden uzak ve soğuk bir araç değildir. Tam tersine teknoloji; bedene uyum sağlayan, onun hareketlerinden enerji alan ve sağlık sorunlarını daha erken fark etmeye çalışan bir yardımcıya dönüşür.",
      "wordCount": 355,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin ana düşüncesi aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Sağlık alanındaki bütün sorunlar elektronik cihazlarla çözülebilir."
            },
            {
              "key": "B",
              "text": "Bilim insanlarının başarılı olması için çalışmalarını yurt dışında sürdürmesi gerekir."
            },
            {
              "key": "C",
              "text": "Canan Dağdeviren, bilimsel bilgisini insan yaşamındaki gerçek sorunlara çözüm üretmek için kullanmıştır."
            },
            {
              "key": "D",
              "text": "Tıbbi cihazların geliştirilmesinde yalnızca fizik mühendisleri görev almalıdır."
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "Canan Dağdeviren’in üniversite yıllarında John Rogers’ın çalışmalarını okuması onu nasıl etkilemiştir?",
          "options": [
            {
              "key": "A",
              "text": "Tıp alanında eğitim almaya karar vermesini sağlamıştır."
            },
            {
              "key": "B",
              "text": "Çalışmak istediği alanı ve laboratuvarı belirlemesine yardımcı olmuştur."
            },
            {
              "key": "C",
              "text": "Lisans eğitimini yarıda bırakarak yurt dışına gitmesine neden olmuştur."
            },
            {
              "key": "D",
              "text": "Piezoelektrik malzemelerden uzaklaşmasına yol açmıştır."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q3",
          "question": "Canan Dağdeviren hangi yılda Illinois İnovasyon Ödülü’nü kazanmıştır?",
          "options": [
            {
              "key": "A",
              "text": "2012"
            },
            {
              "key": "B",
              "text": "2013"
            },
            {
              "key": "C",
              "text": "2015"
            },
            {
              "key": "D",
              "text": "2014"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q4",
          "question": "Piezoelektrik sistemlerin kalp pili gibi cihazlarda kullanılması hangi yararı sağlayabilir?",
          "options": [
            {
              "key": "A",
              "text": "Kalbin doğal hareketlerinin tamamen durdurulmasını"
            },
            {
              "key": "B",
              "text": "Cihazların yalnızca vücut dışında çalışmasını"
            },
            {
              "key": "C",
              "text": "Organ hareketlerinden enerji üreterek pil değiştirme ihtiyacının azalmasını"
            },
            {
              "key": "D",
              "text": "Hastaların sağlık kontrollerine ihtiyaç duymamasını"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q5",
          "question": "Canan Dağdeviren’in giyilebilir ultrason sistemi geliştirmeye yönelmesinde aşağıdakilerden hangisi etkili olmuştur?",
          "options": [
            {
              "key": "A",
              "text": "Kalp pili çalışmalarından sonuç alamaması"
            },
            {
              "key": "B",
              "text": "Meme kanseri riskinin daha sık izlenmesi gerektiğini fark etmesi"
            },
            {
              "key": "C",
              "text": "Geleneksel ultrason cihazlarının görüntü oluşturamaması"
            },
            {
              "key": "D",
              "text": "Piezoelektrik malzemelerin tıbbi cihazlarda kullanılamaması"
            }
          ],
          "correctAnswer": "B"
        }
      ]
    },
    {
      "id": "grade-lise-text-02",
      "grade": "lise",
      "number": 2,
      "title": "ARA GÜLER: İSTANBUL’U FOTOĞRAFLARLA HAFIZAYA KAYDEDEN SANATÇI",
      "paragraphs": [
        "Ara Güler, 16 Ağustos 1928’de İstanbul’da doğdu. Çocukluk ve gençlik yıllarında sinemaya büyük ilgi duydu; lise döneminde film stüdyolarında çalıştı, tiyatro ve oyunculuk eğitimi aldı. Başlangıçta yönetmen ya da oyun yazarı olmayı düşünüyordu. Sinemanın ona kazandırdığı sahne kurma, ışığı izleme ve doğru anı bekleme alışkanlığı, daha sonra fotoğraflarının temelini oluşturdu. 1950’de Yeni İstanbul gazetesinde foto muhabiri olarak çalışmaya başlamasıyla yaşamının yönü kesin biçimde değişti.",
        "Güler’in objektifi yalnızca tarihî yapıları, camileri ya da İstanbul’un tanınmış manzaralarını kaydetmedi. Onun fotoğraflarında balıkçılar, hamallar, işçiler, sokak çocukları, vapur yolcuları ve küçük esnaf da şehrin ayrılmaz parçalarıydı. 1950’li ve 1960’lı yıllarda çektiği siyah-beyaz karelerde sisli Haliç’in önünde çalışan insanlar, Arnavut kaldırımlı sokaklar, ahşap evler ve eski Galata Köprüsü aynı hikâyenin içinde buluşuyordu. Bu nedenle fotoğrafları İstanbul’un yalnızca görünüşünü değil, gündelik yaşamını ve dönemin toplumsal atmosferini de günümüze taşıdı.",
        "Ara Güler kendisini çoğu zaman bir sanatçıdan çok foto muhabiri ve görsel tarihçi olarak tanımladı. Ona göre fotoğrafın merkezinde insan bulunmalıydı. Bir yapıyı görüntülerken bile o yapının çevresinde yaşayan insanları, onların çalışma biçimlerini ve yüzlerindeki ifadeleri önemserdi. Fotoğrafın gerçeğe tanıklık etmesi gerektiğini düşünmesi, çalışmalarının süslenmiş kent görüntülerinden ayrılmasını sağladı. İstanbul’u kusursuz bir kartpostal gibi göstermedi; yoksulluğu, yorgunluğu, değişimi ve kimi zaman hüznü de saklamadan kaydetti.",
        "1958’de Time-Life dergisinin ilk Yakın Doğu muhabiri oldu; Paris Match ve Stern gibi uluslararası yayınlar için de çalıştı. 1960’ların başında Henri Cartier-Bresson ile tanışarak Magnum Photos çevresine katıldı. 1962’de “Master of Leica” unvanını aldı. Yalnızca İstanbul’u değil, Anadolu’yu ve dünyanın farklı bölgelerini de fotoğrafladı. Pablo Picasso, Salvador Dalí, Winston Churchill ve Alfred Hitchcock gibi tanınmış kişilerin portrelerini çekti. Buna rağmen geniş kitlelerin hafızasında en çok İstanbul fotoğraflarıyla yer etti.",
        "Güler’in fotoğraflarının değeri, çekildikleri dönemde güzel görünmelerinden ibaret değildir. Şehir zamanla değişmiş; kimi ahşap evler, iskeleler, atölyeler ve çalışma biçimleri ortadan kalkmıştır. Onun kareleri ise kaybolan ayrıntıları koruyarak geçmişle bugün arasında görsel bir bağ kurmuştur. Ara Güler’in İstanbul’u, yalnızca binalardan oluşan bir şehir değil; insanlarıyla yaşayan, değişen ve hatırlanan büyük bir hikâyedir. Fotoğrafları da bu hikâyenin unutulmasını önleyen sessiz tanıklara dönüşmüştür."
      ],
      "content": "Ara Güler, 16 Ağustos 1928’de İstanbul’da doğdu. Çocukluk ve gençlik yıllarında sinemaya büyük ilgi duydu; lise döneminde film stüdyolarında çalıştı, tiyatro ve oyunculuk eğitimi aldı. Başlangıçta yönetmen ya da oyun yazarı olmayı düşünüyordu. Sinemanın ona kazandırdığı sahne kurma, ışığı izleme ve doğru anı bekleme alışkanlığı, daha sonra fotoğraflarının temelini oluşturdu. 1950’de Yeni İstanbul gazetesinde foto muhabiri olarak çalışmaya başlamasıyla yaşamının yönü kesin biçimde değişti.\n\nGüler’in objektifi yalnızca tarihî yapıları, camileri ya da İstanbul’un tanınmış manzaralarını kaydetmedi. Onun fotoğraflarında balıkçılar, hamallar, işçiler, sokak çocukları, vapur yolcuları ve küçük esnaf da şehrin ayrılmaz parçalarıydı. 1950’li ve 1960’lı yıllarda çektiği siyah-beyaz karelerde sisli Haliç’in önünde çalışan insanlar, Arnavut kaldırımlı sokaklar, ahşap evler ve eski Galata Köprüsü aynı hikâyenin içinde buluşuyordu. Bu nedenle fotoğrafları İstanbul’un yalnızca görünüşünü değil, gündelik yaşamını ve dönemin toplumsal atmosferini de günümüze taşıdı.\n\nAra Güler kendisini çoğu zaman bir sanatçıdan çok foto muhabiri ve görsel tarihçi olarak tanımladı. Ona göre fotoğrafın merkezinde insan bulunmalıydı. Bir yapıyı görüntülerken bile o yapının çevresinde yaşayan insanları, onların çalışma biçimlerini ve yüzlerindeki ifadeleri önemserdi. Fotoğrafın gerçeğe tanıklık etmesi gerektiğini düşünmesi, çalışmalarının süslenmiş kent görüntülerinden ayrılmasını sağladı. İstanbul’u kusursuz bir kartpostal gibi göstermedi; yoksulluğu, yorgunluğu, değişimi ve kimi zaman hüznü de saklamadan kaydetti.\n\n1958’de Time-Life dergisinin ilk Yakın Doğu muhabiri oldu; Paris Match ve Stern gibi uluslararası yayınlar için de çalıştı. 1960’ların başında Henri Cartier-Bresson ile tanışarak Magnum Photos çevresine katıldı. 1962’de “Master of Leica” unvanını aldı. Yalnızca İstanbul’u değil, Anadolu’yu ve dünyanın farklı bölgelerini de fotoğrafladı. Pablo Picasso, Salvador Dalí, Winston Churchill ve Alfred Hitchcock gibi tanınmış kişilerin portrelerini çekti. Buna rağmen geniş kitlelerin hafızasında en çok İstanbul fotoğraflarıyla yer etti.\n\nGüler’in fotoğraflarının değeri, çekildikleri dönemde güzel görünmelerinden ibaret değildir. Şehir zamanla değişmiş; kimi ahşap evler, iskeleler, atölyeler ve çalışma biçimleri ortadan kalkmıştır. Onun kareleri ise kaybolan ayrıntıları koruyarak geçmişle bugün arasında görsel bir bağ kurmuştur. Ara Güler’in İstanbul’u, yalnızca binalardan oluşan bir şehir değil; insanlarıyla yaşayan, değişen ve hatırlanan büyük bir hikâyedir. Fotoğrafları da bu hikâyenin unutulmasını önleyen sessiz tanıklara dönüşmüştür.",
      "wordCount": 328,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin ana düşüncesi aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Ara Güler, yalnızca dünyaca tanınan kişilerin portrelerini çekerek ün kazanmıştır."
            },
            {
              "key": "B",
              "text": "Ara Güler, İstanbul’un değişen yaşamını insan merkezli fotoğraflarıyla görsel hafızaya aktarmıştır."
            },
            {
              "key": "C",
              "text": "İstanbul’un geçmişini öğrenmenin tek yolu siyah-beyaz fotoğrafları incelemektir."
            },
            {
              "key": "D",
              "text": "Ara Güler’in fotoğrafçılığa yönelmesinde yalnızca gazetecilik eğitimi etkili olmuştur."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Ara Güler’in gençlik yıllarında sinemayla ilgilenmesi, fotoğraf çalışmalarına nasıl katkı sağlamıştır?",
          "options": [
            {
              "key": "A",
              "text": "Fotoğraflarını yalnızca sinema oyuncularıyla sınırlandırmasına"
            },
            {
              "key": "B",
              "text": "Gazetecilikten uzaklaşıp film yönetmenliğine yönelmesine"
            },
            {
              "key": "C",
              "text": "Işığı, sahneyi ve doğru anı daha dikkatli değerlendirmesine"
            },
            {
              "key": "D",
              "text": "Bütün fotoğraflarını stüdyo ortamında çekmesine"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Ara Güler hangi yılda “Master of Leica” unvanını almıştır?",
          "options": [
            {
              "key": "A",
              "text": "1950"
            },
            {
              "key": "B",
              "text": "1958"
            },
            {
              "key": "C",
              "text": "1962"
            },
            {
              "key": "D",
              "text": "1971"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q4",
          "question": "Ara Güler’in İstanbul’u kusursuz bir kartpostal gibi göstermemesi neyin sonucudur?",
          "options": [
            {
              "key": "A",
              "text": "Fotoğraflarında yalnızca tarihî yapıların ayrıntılarına yer vermesinin"
            },
            {
              "key": "B",
              "text": "Şehrin gerçek yaşamına ve insanlarının koşullarına tanıklık etmek istemesinin"
            },
            {
              "key": "C",
              "text": "Siyah-beyaz fotoğraf tekniğinin renkli görüntülere izin vermemesinin"
            },
            {
              "key": "D",
              "text": "Uluslararası yayınların İstanbul manzaralarına ilgi göstermemesinin"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "Metinde Ara Güler’in fotoğraflarının “sessiz tanıklar” olarak nitelendirilmesinin nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Geçmişteki insanları ve artık kaybolan şehir ayrıntılarını görüntülerle korumaları"
            },
            {
              "key": "B",
              "text": "Fotoğrafların çekildiği yerlerde insanların konuşmasına izin verilmemesi"
            },
            {
              "key": "C",
              "text": "İstanbul’daki yapıların değişmeden günümüze ulaşmasını sağlamaları"
            },
            {
              "key": "D",
              "text": "Fotoğraflarda yalnızca sakin ve kalabalıktan uzak yerlerin bulunması"
            }
          ],
          "correctAnswer": "A"
        }
      ]
    },
    {
      "id": "grade-lise-text-03",
      "grade": "lise",
      "number": 3,
      "title": "MİMAR SİNAN’IN ESERLERİNDE DENGE VE USTALIK",
      "paragraphs": [
        "Mimar Sinan, Osmanlı mimarisinin gelişiminde belirleyici rol oynayan isimlerden biridir. Kanuni Sultan Süleyman, II. Selim ve III. Murad dönemlerinde yaklaşık elli yıl boyunca mimarbaşı olarak görev yaptı. Bu uzun çalışma süresi boyunca yalnızca camiler değil; medreseler, köprüler, hamamlar, su yolları, türbeler ve sosyal yapılar da tasarladı. Onun eserlerini önemli kılan, yapıların büyüklüğünden çok sağlamlık, işlev ve estetik arasında kurduğu dengedir. Sinan için mimarlık, yalnızca taşları üst üste yerleştirmek değil; insanların kullanacağı mekânları çevresiyle uyumlu biçimde düzenlemekti.",
        "Sinan’ın mesleki gelişimi çoğunlukla üç önemli cami üzerinden anlatılır. Kendisi Şehzade Camii’ni “çıraklık”, Süleymaniye Camii’ni “kalfalık”, Selimiye Camii’ni ise “ustalık” eseri olarak değerlendirmiştir. Bu sınıflandırma, ilk eserlerinin değersiz olduğu anlamına gelmez. Tam tersine her yapı, önceki deneyimlerin geliştirilerek yeni sorunlara uygulanmasını gösterir. İstanbul’daki Süleymaniye Camii, 1551-1558 yılları arasında inşa edilmiş; geniş iç mekânı, kubbe düzeni ve şehrin görünümüne uyum sağlayan konumuyla klasik Osmanlı mimarisinin başlıca örneklerinden biri olmuştur.",
        "Sinan’ın ustalık eseri olarak nitelendirdiği Selimiye Camii ise Edirne’de yükselir. Yapımına 1568 yılında başlanan yapı 1575’te tamamlanmıştır. Caminin merkezindeki büyük kubbe sekiz ana taşıyıcı üzerine oturtulmuştur. Bu düzen sayesinde iç mekânı bölen çok sayıda kalın duvara ihtiyaç duyulmamış, insanlar kubbeyi ve çevresini daha bütünlüklü biçimde görebilmiştir. Selimiye’nin büyük kubbesi, dört ince minaresi, İznik çinileri ve mermer işçiliği yalnızca süsleme amacı taşımaz; yapının bölümleri aynı mimari düşüncenin parçaları olarak birbirini tamamlar. Selimiye Camii ve Külliyesi, bu özellikleri nedeniyle 2011 yılında UNESCO Dünya Mirası Listesi’ne alınmıştır.",
        "Sinan, yapılarını tasarlarken yalnızca dış görünüşü düşünmemiştir. Işığın pencerelerden içeri giriş biçimi, sesin geniş mekânda yayılması, insanların yapıya rahatça ulaşması ve binanın çevresindeki diğer yapılarla ilişkisi de tasarımın parçasıdır. Cami çevresinde medrese, kütüphane, çarşı ve benzeri yapıların bulunması, mimarinin günlük yaşamdan ayrı düşünülmediğini gösterir. Böylece bir külliye yalnızca ibadet edilen bir alan değil; eğitim, alışveriş ve toplumsal buluşma işlevleri bulunan bir merkez hâline gelirdi.",
        "Mimar Sinan’ın eserleri, bir yapının etkileyici görünmesinin tek başına yeterli olmadığını gösterir. Büyük bir kubbe, onu taşıyan sistem doğru kurulmadığında yalnızca risk oluşturur; güzel bir süsleme, mekânın işlevini engellediğinde anlamını kaybeder. Sinan’ın mimarisindeki ustalık, gösteriş ile sadelik, yenilik ile gelenek ve güzellik ile dayanıklılık arasında ölçülü bir ilişki kurabilmesinden doğar. Bu nedenle eserleri, aradan yüzyıllar geçmesine rağmen yalnızca tarihî yapılar olarak değil, çözüm üreten mimari düşüncenin örnekleri olarak incelenmektedir."
      ],
      "content": "Mimar Sinan, Osmanlı mimarisinin gelişiminde belirleyici rol oynayan isimlerden biridir. Kanuni Sultan Süleyman, II. Selim ve III. Murad dönemlerinde yaklaşık elli yıl boyunca mimarbaşı olarak görev yaptı. Bu uzun çalışma süresi boyunca yalnızca camiler değil; medreseler, köprüler, hamamlar, su yolları, türbeler ve sosyal yapılar da tasarladı. Onun eserlerini önemli kılan, yapıların büyüklüğünden çok sağlamlık, işlev ve estetik arasında kurduğu dengedir. Sinan için mimarlık, yalnızca taşları üst üste yerleştirmek değil; insanların kullanacağı mekânları çevresiyle uyumlu biçimde düzenlemekti.\n\nSinan’ın mesleki gelişimi çoğunlukla üç önemli cami üzerinden anlatılır. Kendisi Şehzade Camii’ni “çıraklık”, Süleymaniye Camii’ni “kalfalık”, Selimiye Camii’ni ise “ustalık” eseri olarak değerlendirmiştir. Bu sınıflandırma, ilk eserlerinin değersiz olduğu anlamına gelmez. Tam tersine her yapı, önceki deneyimlerin geliştirilerek yeni sorunlara uygulanmasını gösterir. İstanbul’daki Süleymaniye Camii, 1551-1558 yılları arasında inşa edilmiş; geniş iç mekânı, kubbe düzeni ve şehrin görünümüne uyum sağlayan konumuyla klasik Osmanlı mimarisinin başlıca örneklerinden biri olmuştur.\n\nSinan’ın ustalık eseri olarak nitelendirdiği Selimiye Camii ise Edirne’de yükselir. Yapımına 1568 yılında başlanan yapı 1575’te tamamlanmıştır. Caminin merkezindeki büyük kubbe sekiz ana taşıyıcı üzerine oturtulmuştur. Bu düzen sayesinde iç mekânı bölen çok sayıda kalın duvara ihtiyaç duyulmamış, insanlar kubbeyi ve çevresini daha bütünlüklü biçimde görebilmiştir. Selimiye’nin büyük kubbesi, dört ince minaresi, İznik çinileri ve mermer işçiliği yalnızca süsleme amacı taşımaz; yapının bölümleri aynı mimari düşüncenin parçaları olarak birbirini tamamlar. Selimiye Camii ve Külliyesi, bu özellikleri nedeniyle 2011 yılında UNESCO Dünya Mirası Listesi’ne alınmıştır.\n\nSinan, yapılarını tasarlarken yalnızca dış görünüşü düşünmemiştir. Işığın pencerelerden içeri giriş biçimi, sesin geniş mekânda yayılması, insanların yapıya rahatça ulaşması ve binanın çevresindeki diğer yapılarla ilişkisi de tasarımın parçasıdır. Cami çevresinde medrese, kütüphane, çarşı ve benzeri yapıların bulunması, mimarinin günlük yaşamdan ayrı düşünülmediğini gösterir. Böylece bir külliye yalnızca ibadet edilen bir alan değil; eğitim, alışveriş ve toplumsal buluşma işlevleri bulunan bir merkez hâline gelirdi.\n\nMimar Sinan’ın eserleri, bir yapının etkileyici görünmesinin tek başına yeterli olmadığını gösterir. Büyük bir kubbe, onu taşıyan sistem doğru kurulmadığında yalnızca risk oluşturur; güzel bir süsleme, mekânın işlevini engellediğinde anlamını kaybeder. Sinan’ın mimarisindeki ustalık, gösteriş ile sadelik, yenilik ile gelenek ve güzellik ile dayanıklılık arasında ölçülü bir ilişki kurabilmesinden doğar. Bu nedenle eserleri, aradan yüzyıllar geçmesine rağmen yalnızca tarihî yapılar olarak değil, çözüm üreten mimari düşüncenin örnekleri olarak incelenmektedir.",
      "wordCount": 361,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin ana düşüncesi aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Mimar Sinan’ın eserlerinin değeri yalnızca büyük kubbeler kullanmasından kaynaklanır."
            },
            {
              "key": "B",
              "text": "Osmanlı mimarisindeki bütün önemli yapılar Mimar Sinan tarafından tasarlanmıştır."
            },
            {
              "key": "C",
              "text": "Mimar Sinan, estetik, işlev ve sağlamlığı bir araya getiren yapılarıyla mimarlıkta kalıcı bir iz bırakmıştır."
            },
            {
              "key": "D",
              "text": "Mimar Sinan’ın ilk dönem eserleri, sonraki çalışmalarına göre mimari değer taşımamaktadır."
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "Mimar Sinan’ın Şehzade, Süleymaniye ve Selimiye camilerini farklı mesleki dönemlerle adlandırması neyi göstermektedir?",
          "options": [
            {
              "key": "A",
              "text": "Her yapıda önceki deneyimlerini geliştirerek ustalığını ilerlettiğini"
            },
            {
              "key": "B",
              "text": "Yalnızca Selimiye Camii’nin kendi tasarımı olduğunu"
            },
            {
              "key": "C",
              "text": "İlk eserlerinde sağlamlığa önem vermediğini"
            },
            {
              "key": "D",
              "text": "Aynı mimari planı bütün yapılarında değiştirmeden kullandığını"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q3",
          "question": "Selimiye Camii ve Külliyesi hangi yılda UNESCO Dünya Mirası Listesi’ne alınmıştır?",
          "options": [
            {
              "key": "A",
              "text": "1975"
            },
            {
              "key": "B",
              "text": "1985"
            },
            {
              "key": "C",
              "text": "2001"
            },
            {
              "key": "D",
              "text": "2011"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q4",
          "question": "Selimiye Camii’nin kubbesinin sekiz ana taşıyıcı üzerine oturtulması yapıya hangi özelliği kazandırmıştır?",
          "options": [
            {
              "key": "A",
              "text": "Caminin çevresindeki diğer yapıların kaldırılmasını sağlamıştır."
            },
            {
              "key": "B",
              "text": "İç mekânın daha bütünlüklü ve geniş algılanmasına yardımcı olmuştur."
            },
            {
              "key": "C",
              "text": "Yapının yalnızca dışarıdan görülmesini mümkün hâle getirmiştir."
            },
            {
              "key": "D",
              "text": "Süslemelerin taşıyıcı sistemin yerine kullanılmasını sağlamıştır."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "Metne göre külliyelerde farklı yapıların bir arada bulunması aşağıdakilerden hangisinin göstergesidir?",
          "options": [
            {
              "key": "A",
              "text": "Mimari yapıların yalnızca yöneticilerin kullanımına ayrıldığının"
            },
            {
              "key": "B",
              "text": "Büyük camilerin şehir merkezlerinden uzak tutulduğunun"
            },
            {
              "key": "C",
              "text": "Mimarlığın eğitim, ticaret ve sosyal yaşamla birlikte düşünüldüğünün"
            },
            {
              "key": "D",
              "text": "Her yapının diğerlerinden bağımsız olarak planlandığının"
            }
          ],
          "correctAnswer": "C"
        }
      ]
    },
    {
      "id": "grade-lise-text-04",
      "grade": "lise",
      "number": 4,
      "title": "ÂŞIK VEYSEL’İN HAYATINDA MÜZİK VE ANADOLU",
      "paragraphs": [
        "Âşık Veysel Şatıroğlu, 1894 yılında Sivas’ın Şarkışla ilçesine bağlı Sivrialan köyünde dünyaya geldi. Çiftçilik ve hayvancılıkla geçinen bir ailenin çocuğuydu. Yedi yaşındayken geçirdiği çiçek hastalığı nedeniyle bir gözünü kaybetti; diğer gözünün görme yetisini de daha sonra yaşanan bir kaza sonucunda yitirdi. Babası Ahmet Bey, içine kapanan oğlunun hayata bağlanmasına yardımcı olmak için ona bir saz aldı. Veysel, önce çevresindeki halk ozanlarını dinledi, ardından Çamşıhlı Ali Ağa’dan ders alarak bağlama çalmayı öğrendi. Karacaoğlan, Pir Sultan Abdal ve Âşık Ruhsati gibi ozanların şiirleriyle tanışması, onun söz ve müzik dünyasının şekillenmesinde etkili oldu.",
        "Veysel’in uzun yıllar köy çevresinde sürdürdüğü sanat yaşamı, 1931’de Sivas’ta düzenlenen Halk Şairleri Bayramı’na katılmasıyla değişti. Ahmet Kutsi Tecer’in düzenlenmesine katkı sağladığı bu etkinlik, onun daha geniş çevrelerce tanınmasına imkân verdi. Cumhuriyet’in onuncu yılı için yazdığı şiiri nedeniyle 1933’te Ankara’ya davet edildi. Daha sonraki yıllarda Arifiye, Hasanoğlan ve Çifteler Köy Enstitülerinde saz dersleri verdi; halk evlerinde ve radyolarda şiirlerini seslendirdi. Böylece köyünde öğrendiği âşıklık geleneğini farklı şehirlerdeki gençlere ve dinleyicilere ulaştırdı.",
        "Âşık Veysel’in şiirlerinde Anadolu, yalnızca yaşanılan bir coğrafya değildir. Toprak; insanı besleyen, emeğe karşılık veren ve yaşamın sonunda herkesi yeniden kabul eden bir varlık olarak ele alınır. Şiirlerinde doğa, sevgi, ölüm, birlik, insanın dünyadaki yolculuğu ve insanlar arasındaki kırgınlıklar sıkça işlenir. Kullandığı dil açık ve yalındır; ancak bu sadeliğin içinde güçlü anlamlar bulunur. Günlük hayatta kullanılan sözcüklerle insanın yaşamını, yalnızlığını ve dünyayla ilişkisini anlatabilmesi, eserlerinin farklı kuşaklar tarafından anlaşılmasını sağlamıştır.",
        "Veysel, geleneksel âşıklık birikimini olduğu gibi tekrarlamakla yetinmedi. Kendine özgü söyleyiş biçimi ve bağlama kullanımı geliştirdi. Bağlamadaki özel akort biçimlerinden biri zamanla “Veysel düzeni” adıyla anılmaya başladı. Sazı, şiiri taşıyan basit bir eşlik aracı değil; sözün duygusunu tamamlayan ikinci bir anlatıcı gibi kullandı. Şiirlerinin birçoğunun türkü hâlinde söylenmesi, onun yalnızca edebiyat dünyasında değil, Türk halk müziğinde de kalıcı bir yer edinmesini sağladı.",
        "Âşık Veysel, 21 Mart 1973’te doğduğu Sivrialan köyünde hayatını kaybetti. Ölümünden yıllar sonra bile şiirleri yeniden yorumlandı, eserleri derslerde ve konserlerde yaşatıldı. Vefatının 50. yılı olan 2023, UNESCO’nun Anma ve Kutlama Yıl Dönümleri Programı’na dâhil edildi. Bu ilgi, onun değerinin yalnızca kişisel yaşamındaki zorlukları aşmasından kaynaklanmadığını gösterir. Âşık Veysel, Anadolu insanının duygu ve düşüncelerini kişisel deneyimleriyle birleştirerek yerel bir anlatımı ortak bir insanlık diline dönüştürmüştür."
      ],
      "content": "Âşık Veysel Şatıroğlu, 1894 yılında Sivas’ın Şarkışla ilçesine bağlı Sivrialan köyünde dünyaya geldi. Çiftçilik ve hayvancılıkla geçinen bir ailenin çocuğuydu. Yedi yaşındayken geçirdiği çiçek hastalığı nedeniyle bir gözünü kaybetti; diğer gözünün görme yetisini de daha sonra yaşanan bir kaza sonucunda yitirdi. Babası Ahmet Bey, içine kapanan oğlunun hayata bağlanmasına yardımcı olmak için ona bir saz aldı. Veysel, önce çevresindeki halk ozanlarını dinledi, ardından Çamşıhlı Ali Ağa’dan ders alarak bağlama çalmayı öğrendi. Karacaoğlan, Pir Sultan Abdal ve Âşık Ruhsati gibi ozanların şiirleriyle tanışması, onun söz ve müzik dünyasının şekillenmesinde etkili oldu.\n\nVeysel’in uzun yıllar köy çevresinde sürdürdüğü sanat yaşamı, 1931’de Sivas’ta düzenlenen Halk Şairleri Bayramı’na katılmasıyla değişti. Ahmet Kutsi Tecer’in düzenlenmesine katkı sağladığı bu etkinlik, onun daha geniş çevrelerce tanınmasına imkân verdi. Cumhuriyet’in onuncu yılı için yazdığı şiiri nedeniyle 1933’te Ankara’ya davet edildi. Daha sonraki yıllarda Arifiye, Hasanoğlan ve Çifteler Köy Enstitülerinde saz dersleri verdi; halk evlerinde ve radyolarda şiirlerini seslendirdi. Böylece köyünde öğrendiği âşıklık geleneğini farklı şehirlerdeki gençlere ve dinleyicilere ulaştırdı.\n\nÂşık Veysel’in şiirlerinde Anadolu, yalnızca yaşanılan bir coğrafya değildir. Toprak; insanı besleyen, emeğe karşılık veren ve yaşamın sonunda herkesi yeniden kabul eden bir varlık olarak ele alınır. Şiirlerinde doğa, sevgi, ölüm, birlik, insanın dünyadaki yolculuğu ve insanlar arasındaki kırgınlıklar sıkça işlenir. Kullandığı dil açık ve yalındır; ancak bu sadeliğin içinde güçlü anlamlar bulunur. Günlük hayatta kullanılan sözcüklerle insanın yaşamını, yalnızlığını ve dünyayla ilişkisini anlatabilmesi, eserlerinin farklı kuşaklar tarafından anlaşılmasını sağlamıştır.\n\nVeysel, geleneksel âşıklık birikimini olduğu gibi tekrarlamakla yetinmedi. Kendine özgü söyleyiş biçimi ve bağlama kullanımı geliştirdi. Bağlamadaki özel akort biçimlerinden biri zamanla “Veysel düzeni” adıyla anılmaya başladı. Sazı, şiiri taşıyan basit bir eşlik aracı değil; sözün duygusunu tamamlayan ikinci bir anlatıcı gibi kullandı. Şiirlerinin birçoğunun türkü hâlinde söylenmesi, onun yalnızca edebiyat dünyasında değil, Türk halk müziğinde de kalıcı bir yer edinmesini sağladı.\n\nÂşık Veysel, 21 Mart 1973’te doğduğu Sivrialan köyünde hayatını kaybetti. Ölümünden yıllar sonra bile şiirleri yeniden yorumlandı, eserleri derslerde ve konserlerde yaşatıldı. Vefatının 50. yılı olan 2023, UNESCO’nun Anma ve Kutlama Yıl Dönümleri Programı’na dâhil edildi. Bu ilgi, onun değerinin yalnızca kişisel yaşamındaki zorlukları aşmasından kaynaklanmadığını gösterir. Âşık Veysel, Anadolu insanının duygu ve düşüncelerini kişisel deneyimleriyle birleştirerek yerel bir anlatımı ortak bir insanlık diline dönüştürmüştür.",
      "wordCount": 358,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin ana düşüncesi aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Âşık Veysel’in tanınmasında yalnızca resmî kurumlarda görev yapması etkili olmuştur."
            },
            {
              "key": "B",
              "text": "Âşık Veysel, Anadolu’nun yaşamını yalın bir dille ve özgün müziğiyle evrensel bir anlatıma dönüştürmüştür."
            },
            {
              "key": "C",
              "text": "Âşıklık geleneğinin devam edebilmesi için sanatçıların köylerinden ayrılmaması gerekir."
            },
            {
              "key": "D",
              "text": "Âşık Veysel’in eserlerinin değeri, yaşamında karşılaştığı zorluklardan kaynaklanmaktadır."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Âşık Veysel’in daha geniş çevreler tarafından tanınmasında etkili olan gelişme aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Köy Enstitülerinde saz dersleri vermeye başlaması"
            },
            {
              "key": "B",
              "text": "Bağlamada kendine özgü bir akort geliştirmesi"
            },
            {
              "key": "C",
              "text": "Sivas’taki Halk Şairleri Bayramı’na katılması"
            },
            {
              "key": "D",
              "text": "Şiirlerinin farklı sanatçılar tarafından yorumlanması"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Âşık Veysel, Sivas’ta düzenlenen Halk Şairleri Bayramı’na hangi yılda katılmıştır?",
          "options": [
            {
              "key": "A",
              "text": "1923"
            },
            {
              "key": "B",
              "text": "1931"
            },
            {
              "key": "C",
              "text": "1933"
            },
            {
              "key": "D",
              "text": "1943"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q4",
          "question": "Metne göre Âşık Veysel’in şiirlerinin farklı kuşaklara ulaşmasında aşağıdakilerden hangisi etkili olmuştur?",
          "options": [
            {
              "key": "A",
              "text": "Yalın bir dil kullanırken yaşamın temel sorunlarını ele alması"
            },
            {
              "key": "B",
              "text": "Şiirlerini yalnızca geleneksel halk hikâyelerine dayandırması"
            },
            {
              "key": "C",
              "text": "Eserlerinde anlaşılması güç ve süslü bir anlatımı tercih etmesi"
            },
            {
              "key": "D",
              "text": "Anadolu dışındaki toplumsal konulara hiç yer vermemesi"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q5",
          "question": "Âşık Veysel’in sazı “ikinci bir anlatıcı” gibi kullanmasıyla anlatılmak istenen aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Bağlamanın şiirlerden bağımsız bir müzik oluşturduğu"
            },
            {
              "key": "B",
              "text": "Şiirlerinin yalnızca saz eşliğinde anlaşılabildiği"
            },
            {
              "key": "C",
              "text": "Müziğin sözlerdeki duygu ve anlamı tamamladığı"
            },
            {
              "key": "D",
              "text": "Bağlamanın insan sesinin yerine geçtiği"
            }
          ],
          "correctAnswer": "C"
        }
      ]
    },
    {
      "id": "grade-lise-text-05",
      "grade": "lise",
      "number": 5,
      "title": "ZEUGMA MOZAİKLERİNİN YÜZYILLAR SÜREN HİKÂYESİ",
      "paragraphs": [
        "Zeugma Antik Kenti, Gaziantep’in Nizip ilçesi yakınlarında, Fırat Nehri kıyısında kurulmuştur. Kentin temelleri, Büyük İskender’in komutanlarından I. Seleukos Nikator tarafından MÖ 300 yılları civarında atıldı. Nehrin karşılıklı kıyılarında kurulan Seleukeia ve Apameia adlı iki yerleşim, bir köprüyle birbirine bağlanıyordu. Antik Yunancada “köprü” veya “geçiş yeri” anlamına gelen Zeugma adı da kentin bu özelliğinden doğdu. Önemli ticaret yolları üzerinde bulunan kent, Roma Dönemi’nde askerî ve ekonomik açıdan gelişerek farklı kültürlerin karşılaştığı hareketli bir merkeze dönüştü.",
        "Zeugma’da yaşayan varlıklı kişiler, avlulu ve geniş villalarının tabanlarını mozaiklerle süsletiyordu. İkinci ve üçüncü yüzyıllara tarihlenen bu mozaikler, küçük taş ve cam parçalarının yan yana yerleştirilmesiyle oluşturulmuştu. Eserlerde Okeanos, Tethys, Dionysos ve Europa gibi mitolojik kişilerin yanı sıra hayvanlar, bitkiler ve geometrik desenler de bulunuyordu. Bazı mozaiklerde sanatçıların veya eserleri yaptıran kişilerin adlarının yer alması, bu çalışmaların sıradan zemin süslemeleri olarak görülmediğini gösterir.",
        "Kentin önemli bir bölümü yüzyıllar boyunca toprak altında kaldı. Zeugma’daki ilk bilimsel kazılar 1987’de başladı. Fırat Nehri üzerinde yapılan Birecik Barajı nedeniyle bazı bölgelerin su altında kalacağının anlaşılması üzerine kurtarma çalışmaları hızlandırıldı. Arkeologlar, henüz su ulaşmadan önce villalardaki mozaikleri, duvar resimlerini ve çeşitli eserleri dikkatle çıkardı. Bu çalışmalar yalnızca değerli sanat eserlerini kurtarmadı; Roma Dönemi’nde insanların nasıl yaşadığı, evlerini nasıl düzenlediği ve hangi hikâyelere önem verdiği hakkında da bilgiler sundu.",
        "Kazılarda ortaya çıkarılan en tanınmış eserlerden biri, bakışlarının izleyiciyi farklı yönlerden takip ettiği düşünülen Çingene Kızı Mozaiği oldu. Eserin büyük bir taban mozaiğine ait olduğu ve yüz bölümünün mozaiğin yalnızca küçük bir parçasını oluşturduğu anlaşılmıştır. Bu mozaiğin yıllar önce yurt dışına götürülen çevre parçalarından 12’si, Türkiye’de yürütülen çalışmaların ardından 2018’de Amerika Birleşik Devletleri’nden Gaziantep’e getirildi. Eserlerin yeniden bir araya gelmesi, kültürel mirasın korunmasının kazılarla sınırlı olmadığını; bilimsel, hukuki ve diplomatik çaba da gerektirdiğini gösterdi.",
        "Zeugma Mozaik Müzesi 2011’de ziyarete açıldı. Müze ve sergi merkezinin toplam oturum alanı yaklaşık 30 bin metrekaredir. Mozaikler burada yalnızca duvarlara asılan sanat eserleri gibi sergilenmez; bulundukları evlerin mimari düzeni ve Fırat kıyısındaki yaşamla bağlantı kurularak sunulur. Böylece ziyaretçi bir mozaiğe bakarken hem sanatçının renk ve hareket oluşturmadaki ustalığını hem de yüzyıllar önce yaşamış insanların inançlarını, zevklerini ve günlük hayatlarını inceleyebilir. Zeugma mozaiklerinin yüzyıllar sonra hâlâ ilgi görmesinin nedeni yalnızca güzellikleri değil, geçmişin sessiz ayrıntılarını günümüze taşıyan tarihî belgeler olmalarıdır."
      ],
      "content": "Zeugma Antik Kenti, Gaziantep’in Nizip ilçesi yakınlarında, Fırat Nehri kıyısında kurulmuştur. Kentin temelleri, Büyük İskender’in komutanlarından I. Seleukos Nikator tarafından MÖ 300 yılları civarında atıldı. Nehrin karşılıklı kıyılarında kurulan Seleukeia ve Apameia adlı iki yerleşim, bir köprüyle birbirine bağlanıyordu. Antik Yunancada “köprü” veya “geçiş yeri” anlamına gelen Zeugma adı da kentin bu özelliğinden doğdu. Önemli ticaret yolları üzerinde bulunan kent, Roma Dönemi’nde askerî ve ekonomik açıdan gelişerek farklı kültürlerin karşılaştığı hareketli bir merkeze dönüştü.\n\nZeugma’da yaşayan varlıklı kişiler, avlulu ve geniş villalarının tabanlarını mozaiklerle süsletiyordu. İkinci ve üçüncü yüzyıllara tarihlenen bu mozaikler, küçük taş ve cam parçalarının yan yana yerleştirilmesiyle oluşturulmuştu. Eserlerde Okeanos, Tethys, Dionysos ve Europa gibi mitolojik kişilerin yanı sıra hayvanlar, bitkiler ve geometrik desenler de bulunuyordu. Bazı mozaiklerde sanatçıların veya eserleri yaptıran kişilerin adlarının yer alması, bu çalışmaların sıradan zemin süslemeleri olarak görülmediğini gösterir.\n\nKentin önemli bir bölümü yüzyıllar boyunca toprak altında kaldı. Zeugma’daki ilk bilimsel kazılar 1987’de başladı. Fırat Nehri üzerinde yapılan Birecik Barajı nedeniyle bazı bölgelerin su altında kalacağının anlaşılması üzerine kurtarma çalışmaları hızlandırıldı. Arkeologlar, henüz su ulaşmadan önce villalardaki mozaikleri, duvar resimlerini ve çeşitli eserleri dikkatle çıkardı. Bu çalışmalar yalnızca değerli sanat eserlerini kurtarmadı; Roma Dönemi’nde insanların nasıl yaşadığı, evlerini nasıl düzenlediği ve hangi hikâyelere önem verdiği hakkında da bilgiler sundu.\n\nKazılarda ortaya çıkarılan en tanınmış eserlerden biri, bakışlarının izleyiciyi farklı yönlerden takip ettiği düşünülen Çingene Kızı Mozaiği oldu. Eserin büyük bir taban mozaiğine ait olduğu ve yüz bölümünün mozaiğin yalnızca küçük bir parçasını oluşturduğu anlaşılmıştır. Bu mozaiğin yıllar önce yurt dışına götürülen çevre parçalarından 12’si, Türkiye’de yürütülen çalışmaların ardından 2018’de Amerika Birleşik Devletleri’nden Gaziantep’e getirildi. Eserlerin yeniden bir araya gelmesi, kültürel mirasın korunmasının kazılarla sınırlı olmadığını; bilimsel, hukuki ve diplomatik çaba da gerektirdiğini gösterdi.\n\nZeugma Mozaik Müzesi 2011’de ziyarete açıldı. Müze ve sergi merkezinin toplam oturum alanı yaklaşık 30 bin metrekaredir. Mozaikler burada yalnızca duvarlara asılan sanat eserleri gibi sergilenmez; bulundukları evlerin mimari düzeni ve Fırat kıyısındaki yaşamla bağlantı kurularak sunulur. Böylece ziyaretçi bir mozaiğe bakarken hem sanatçının renk ve hareket oluşturmadaki ustalığını hem de yüzyıllar önce yaşamış insanların inançlarını, zevklerini ve günlük hayatlarını inceleyebilir. Zeugma mozaiklerinin yüzyıllar sonra hâlâ ilgi görmesinin nedeni yalnızca güzellikleri değil, geçmişin sessiz ayrıntılarını günümüze taşıyan tarihî belgeler olmalarıdır.",
      "wordCount": 361,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin ana düşüncesi aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Zeugma, yalnızca askerî amaçlarla kurulmuş bir Roma kentidir."
            },
            {
              "key": "B",
              "text": "Zeugma mozaikleri, sanat değerlerinin yanında geçmiş yaşam hakkında bilgi taşıyan kültürel miraslardır."
            },
            {
              "key": "C",
              "text": "Antik kentlerde bulunan bütün mozaikler aynı konuları ve yapım tekniklerini içerir."
            },
            {
              "key": "D",
              "text": "Zeugma’nın tanınmasının tek nedeni Çingene Kızı Mozaiği’nin bulunmasıdır."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Antik kente “Zeugma” adının verilmesinin nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Kentte çok sayıda mozaik atölyesinin bulunması"
            },
            {
              "key": "B",
              "text": "Farklı kültürlerin aynı yönetim altında birleşmesi"
            },
            {
              "key": "C",
              "text": "Nehrin iki kıyısındaki yerleşimlerin bir geçitle bağlanması"
            },
            {
              "key": "D",
              "text": "Kentin Roma ordusu tarafından korunması"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Çingene Kızı Mozaiği’ne ait kaç çevre parçası 2018’de Türkiye’ye getirilmiştir?",
          "options": [
            {
              "key": "A",
              "text": "8"
            },
            {
              "key": "B",
              "text": "10"
            },
            {
              "key": "C",
              "text": "12"
            },
            {
              "key": "D",
              "text": "16"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q4",
          "question": "Zeugma mozaiklerinin tarihî belge olarak görülmesinin temel nedeni aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Yalnızca pahalı malzemeler kullanılarak yapılmaları"
            },
            {
              "key": "B",
              "text": "Antik dönemin yaşamı, inançları ve sanat anlayışı hakkında bilgi vermeleri"
            },
            {
              "key": "C",
              "text": "Tamamının aynı sanatçı tarafından hazırlanmış olması"
            },
            {
              "key": "D",
              "text": "Günümüzdeki mimari yapılarda da aynı şekilde kullanılmaları"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "Kurtarma kazılarının hızlandırılması ile müzenin kurulması arasında nasıl bir ilişki vardır?",
          "options": [
            {
              "key": "A",
              "text": "Su altında kalma tehlikesindeki eserler çıkarılarak korunmuş ve sergilenebilir hâle getirilmiştir."
            },
            {
              "key": "B",
              "text": "Barajın yapımı durdurularak antik kent bütünüyle eski durumuna döndürülmüştür."
            },
            {
              "key": "C",
              "text": "Kazılarda bulunan eserlerin tamamı çıkarıldıkları villalarda bırakılmıştır."
            },
            {
              "key": "D",
              "text": "Müze kurulduktan sonra antik kentte bilimsel çalışma yapılmasına gerek kalmamıştır."
            }
          ],
          "correctAnswer": "A"
        }
      ]
    },
    {
      "id": "grade-lise-text-06",
      "grade": "lise",
      "number": 6,
      "title": "JAPONYA DEPREMLERE KARŞI NASIL HAZIRLANIYOR?",
      "paragraphs": [
        "Japonya, hareketli levha sınırlarına yakın olduğu için deprem tehlikesini günlük yaşamın dışında kalan uzak bir ihtimal olarak görmez. Ülkenin hazırlık anlayışı, depremin oluşmasını engellemeye değil; binaların zarar görmesini azaltmaya, insanlara birkaç saniye bile olsa harekete geçme fırsatı vermeye ve afet sonrasında temel hizmetleri sürdürebilmeye dayanır. 11 Mart 2011’de meydana gelen 9,0 büyüklüğündeki Büyük Doğu Japonya Depremi, ülkede kaydedilen en büyük deprem olmuş; bu olay, alınan önlemlerin sürekli yenilenmesi gerektiğini bir kez daha göstermiştir.",
        "Hazırlığın ilk ayağı yapı güvenliğidir. Japonya’da 1978 Miyagi-Oki Depremi’nin ardından bina kuralları önemli ölçüde gözden geçirilmiş ve yeni deprem dayanıklılığı standartları 1981 yılında yürürlüğe girmiştir. Bu standartlara göre yapılan binaların, 1995 Büyük Hanshin-Awaji Depremi sırasında eski kurallara göre inşa edilen yapılara kıyasla daha az zarar gördüğü belirlenmiştir. Bu nedenle yalnızca yeni binalar için kurallar koymakla yetinilmez; 1981’den önce inşa edilen yapılar incelenir, gerekli olanlarda kolon, kiriş ve duvarları güçlendiren yenilemeler yapılır. Bazı yapılarda ise zeminden gelen sarsıntının üst katlara geçişini azaltan sismik yalıtım sistemlerinden ve hareket enerjisini emen sönümleyicilerden yararlanılır.",
        "İkinci önemli unsur erken uyarıdır. Bir deprem başladığında daha hızlı ilerleyen P dalgaları önce, daha güçlü sarsıntıya yol açan S dalgaları ise daha sonra ulaşır. Japonya Meteoroloji Ajansı, merkez üssüne yakın ölçüm istasyonlarından gelen ilk verileri hızla inceleyerek beklenen sarsıntı şiddetini ve güçlü hareketin varış zamanını tahmin eder. Uyarı; telefonlara, televizyonlara, tren sistemlerine ve çeşitli tesislere iletilebilir. 2011’deki deprem için erken uyarı, en yakın istasyonda ilk P dalgasının belirlenmesinden 8,6 saniye sonra yayımlanmıştır. Bu süre her bölgede uzun olmayabilir; yine de trenlerin yavaşlatılması, makinelerin durdurulması veya insanların başlarını koruyacak bir konuma geçmesi için değerli olabilir.",
        "Teknoloji tek başına yeterli görülmez. Her yıl 1 Eylül’deki Afet Riskini Azaltma Günü çevresinde kamu kurumları, yerel yönetimler ve çeşitli kuruluşlar kapsamlı tatbikatlar gerçekleştirir. 5 Kasım ise Tsunamiye Hazırlık Günü’dür. Okullarda ve iş yerlerinde sarsıntı sırasında güvenli bir konuma geçme, çıkış yollarını kullanma, toplanma alanına ulaşma ve güvenilir bilgi kaynaklarını izleme gibi davranışlar tekrar edilir. Tatbikatların amacı, insanların kuralları yalnızca öğrenmesi değil, panik anında uygulayabilecek kadar alışkanlık kazanmasıdır.",
        "Hazırlık evlerde de devam eder. Japonya’nın afet yönetimi rehberlerinde kişi başına günde yaklaşık 3 litre içme suyu bulundurulması, yiyecek ve temel ihtiyaçların en az 3 gün yetecek miktarda hazırlanması; mümkünse bu sürenin 1 haftaya çıkarılması önerilir. El feneri, pilli radyo, ilaç, ilk yardım malzemesi ve aile iletişim planı da hazırlığın parçalarıdır. Japonya’nın yaklaşımı, “Deprem ne zaman olacak?” sorusuna kesin bir cevap aramaktan çok, “Deprem olduğunda hangi sistemler çalışmayı sürdürecek ve insanlar ne yapacağını bilecek mi?” sorusuna önceden cevap vermeye dayanır."
      ],
      "content": "Japonya, hareketli levha sınırlarına yakın olduğu için deprem tehlikesini günlük yaşamın dışında kalan uzak bir ihtimal olarak görmez. Ülkenin hazırlık anlayışı, depremin oluşmasını engellemeye değil; binaların zarar görmesini azaltmaya, insanlara birkaç saniye bile olsa harekete geçme fırsatı vermeye ve afet sonrasında temel hizmetleri sürdürebilmeye dayanır. 11 Mart 2011’de meydana gelen 9,0 büyüklüğündeki Büyük Doğu Japonya Depremi, ülkede kaydedilen en büyük deprem olmuş; bu olay, alınan önlemlerin sürekli yenilenmesi gerektiğini bir kez daha göstermiştir.\n\nHazırlığın ilk ayağı yapı güvenliğidir. Japonya’da 1978 Miyagi-Oki Depremi’nin ardından bina kuralları önemli ölçüde gözden geçirilmiş ve yeni deprem dayanıklılığı standartları 1981 yılında yürürlüğe girmiştir. Bu standartlara göre yapılan binaların, 1995 Büyük Hanshin-Awaji Depremi sırasında eski kurallara göre inşa edilen yapılara kıyasla daha az zarar gördüğü belirlenmiştir. Bu nedenle yalnızca yeni binalar için kurallar koymakla yetinilmez; 1981’den önce inşa edilen yapılar incelenir, gerekli olanlarda kolon, kiriş ve duvarları güçlendiren yenilemeler yapılır. Bazı yapılarda ise zeminden gelen sarsıntının üst katlara geçişini azaltan sismik yalıtım sistemlerinden ve hareket enerjisini emen sönümleyicilerden yararlanılır.\n\nİkinci önemli unsur erken uyarıdır. Bir deprem başladığında daha hızlı ilerleyen P dalgaları önce, daha güçlü sarsıntıya yol açan S dalgaları ise daha sonra ulaşır. Japonya Meteoroloji Ajansı, merkez üssüne yakın ölçüm istasyonlarından gelen ilk verileri hızla inceleyerek beklenen sarsıntı şiddetini ve güçlü hareketin varış zamanını tahmin eder. Uyarı; telefonlara, televizyonlara, tren sistemlerine ve çeşitli tesislere iletilebilir. 2011’deki deprem için erken uyarı, en yakın istasyonda ilk P dalgasının belirlenmesinden 8,6 saniye sonra yayımlanmıştır. Bu süre her bölgede uzun olmayabilir; yine de trenlerin yavaşlatılması, makinelerin durdurulması veya insanların başlarını koruyacak bir konuma geçmesi için değerli olabilir.\n\nTeknoloji tek başına yeterli görülmez. Her yıl 1 Eylül’deki Afet Riskini Azaltma Günü çevresinde kamu kurumları, yerel yönetimler ve çeşitli kuruluşlar kapsamlı tatbikatlar gerçekleştirir. 5 Kasım ise Tsunamiye Hazırlık Günü’dür. Okullarda ve iş yerlerinde sarsıntı sırasında güvenli bir konuma geçme, çıkış yollarını kullanma, toplanma alanına ulaşma ve güvenilir bilgi kaynaklarını izleme gibi davranışlar tekrar edilir. Tatbikatların amacı, insanların kuralları yalnızca öğrenmesi değil, panik anında uygulayabilecek kadar alışkanlık kazanmasıdır.\n\nHazırlık evlerde de devam eder. Japonya’nın afet yönetimi rehberlerinde kişi başına günde yaklaşık 3 litre içme suyu bulundurulması, yiyecek ve temel ihtiyaçların en az 3 gün yetecek miktarda hazırlanması; mümkünse bu sürenin 1 haftaya çıkarılması önerilir. El feneri, pilli radyo, ilaç, ilk yardım malzemesi ve aile iletişim planı da hazırlığın parçalarıdır. Japonya’nın yaklaşımı, “Deprem ne zaman olacak?” sorusuna kesin bir cevap aramaktan çok, “Deprem olduğunda hangi sistemler çalışmayı sürdürecek ve insanlar ne yapacağını bilecek mi?” sorusuna önceden cevap vermeye dayanır.",
      "wordCount": 408,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Japonya’da meydana gelen büyük depremlerin yol açtığı bütün zararları sıralamak"
            },
            {
              "key": "B",
              "text": "Depremlerin önceden kesin olarak belirlenebilmesi için yapılan araştırmaları açıklamak"
            },
            {
              "key": "C",
              "text": "Japonya’nın deprem zararlarını azaltmak amacıyla uyguladığı hazırlıkları anlatmak"
            },
            {
              "key": "D",
              "text": "Japonya’daki yapıların başka ülkelerdeki yapılardan daha yüksek olduğunu göstermek"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "Metinde 1981’de yürürlüğe giren standartlarla 1995 depremindeki bina hasarlarının birlikte verilmesinin nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "1995’ten sonra bütün eski binaların yıkıldığını göstermek"
            },
            {
              "key": "B",
              "text": "Yeni dayanıklılık kurallarının yapı güvenliğine katkısını örneklendirmek"
            },
            {
              "key": "C",
              "text": "Deprem büyüklüğü ile bina yüksekliği arasındaki ilişkiyi açıklamak"
            },
            {
              "key": "D",
              "text": "Sismik yalıtımın yalnızca 1981’den önce kullanıldığını belirtmek"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q3",
          "question": "2011 Büyük Doğu Japonya Depremi’nde erken uyarı, ilk P dalgasının belirlenmesinden ne kadar sonra yayımlanmıştır?",
          "options": [
            {
              "key": "A",
              "text": "6,8 saniye"
            },
            {
              "key": "B",
              "text": "7,6 saniye"
            },
            {
              "key": "C",
              "text": "9,0 saniye"
            },
            {
              "key": "D",
              "text": "8,6 saniye"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q4",
          "question": "Japonya’nın erken uyarı sistemi güçlü sarsıntı başlamadan önce nasıl uyarı verebilmektedir?",
          "options": [
            {
              "key": "A",
              "text": "Daha hızlı ilerleyen P dalgalarını, güçlü sarsıntı oluşturan S dalgalarından önce belirleyerek"
            },
            {
              "key": "B",
              "text": "Binalardaki sismik yalıtım sistemlerinin hareketini telefonlardan takip ederek"
            },
            {
              "key": "C",
              "text": "Gelecekte meydana gelecek depremlerin yerini aylar öncesinden hesaplayarak"
            },
            {
              "key": "D",
              "text": "S dalgalarını durdurup yalnızca daha zayıf P dalgalarının ilerlemesini sağlayarak"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q5",
          "question": "Metne göre evlerde yapılması önerilen hazırlık aşağıdakilerden hangisinde doğru verilmiştir?",
          "options": [
            {
              "key": "A",
              "text": "Kişi başına günde 1 litre su ve en az 1 günlük yiyecek hazırlamak"
            },
            {
              "key": "B",
              "text": "Kişi başına günde 2 litre su ve en az 2 günlük yiyecek hazırlamak"
            },
            {
              "key": "C",
              "text": "Kişi başına günde yaklaşık 3 litre su ve en az 3 günlük, mümkünse 1 haftalık ihtiyaç hazırlamak"
            },
            {
              "key": "D",
              "text": "Kişi başına günde 5 litre su ve en az 1 aylık yiyecek hazırlamak"
            }
          ],
          "correctAnswer": "C"
        }
      ]
    },
    {
      "id": "grade-lise-text-07",
      "grade": "lise",
      "number": 7,
      "title": "HOLLANDA DENİZ SEVİYESİNİN ALTINDA NASIL YAŞIYOR?",
      "paragraphs": [
        "Hollanda’nın suyla mücadelesi, yalnızca kıyıya set çekmekten ibaret değildir. Ülkenin yaklaşık üçte biri deniz seviyesinin altında bulunur; deniz, büyük göller ve nehirler birlikte düşünüldüğünde topraklarının yaklaşık yüzde 60’ı su baskınına uğrayabilecek alanlar içindedir. Rotterdam ve Amsterdam gibi büyük şehirlerin de bu bölgelerde bulunması, su yönetimini ülkenin günlük yaşamını sürdürebilmesi için zorunlu hâle getirir. Bu nedenle Hollanda, suyu tamamen uzaklaştırmaya çalışmak yerine onun seviyesini sürekli ölçen, yönlendiren ve gerektiğinde önünü kesen çok katmanlı bir sistem geliştirmiştir.",
        "Bu sistemin temel parçalarından biri polderlerdir. Polder; denizden, gölden veya bataklıktan kazanılan ve çevresi setlerle çevrilen alçak arazidir. Setler dışarıdaki suyun içeri girmesini engellese de yağmur ve yer altı suları polderin içinde birikmeye devam eder. Bu yüzden kanallar aracılığıyla toplanan fazla suyun daha yüksek seviyedeki nehirlere ya da denize pompalanması gerekir. Geçmişte bu işi yel değirmenleri yaparken günümüzde elektrikli ve dizel pompa istasyonları kullanılır. UNESCO Dünya Mirası Listesi’ndeki Kinderdijk bölgesi; setleri, kanalları, değirmenleri, pompa istasyonları ve su kapaklarıyla bu tarihsel sistemin hâlâ görülebildiği önemli bir örnektir.",
        "Hollanda’nın denize karşı en tanınmış savunması ise Delta Works adı verilen büyük mühendislik sistemidir. 1953’te yaşanan yıkıcı Kuzey Denizi taşkınının ardından geliştirilen bu sistem, 13 büyük taşkın koruma projesinden oluşur. Sistemin en önemli parçalarından Doğu Scheldt Bariyeri yaklaşık 9 kilometre uzunluğundadır; bunun yaklaşık 3 kilometrelik bölümü hareketli kapılarla kapatılabilir. Bariyer normal koşullarda açık tutularak gelgit hareketinin ve deniz ekosisteminin devamına izin verir, tehlikeli su seviyeleri ortaya çıktığında ise kapatılır. Yapımına 1976’da başlanmış ve çalışma 1986’da tamamlanmıştır.",
        "Rotterdam Limanı’nı koruyan Maeslant Bariyeri de sistemin dikkat çekici yapılarındandır. Dünyadaki en büyük hareketli parçalara sahip su bariyerlerinden biri olan yapı, deniz seviyesinin yaklaşık 5 metre üzerine ulaşan fırtına kabarmalarına dayanacak biçimde tasarlanmıştır. Bu bariyerler sürekli kapalı tutulmaz; çünkü Hollanda’nın limanları, nehirleri ve denizle bağlantılı ekonomik yaşamı açık su yollarına ihtiyaç duyar. Bu nedenle amaç denizi dışarıda bırakmak değil, tehlike anında geçişi kontrollü biçimde durdurmaktır.",
        "Sistemin işletilmesi yalnızca merkezî hükûmetin görevi değildir. Hollanda’da setlerin ve su kapaklarının bakımından, su seviyelerinin düzenlenmesinden ve atık suların arıtılmasından sorumlu 21 bölgesel su idaresi bulunur. Bu kurumların yönetiminde halk tarafından seçilen temsilciler görev yapar. Böylece su yönetimi, yalnızca mühendislerin yürüttüğü teknik bir çalışma olmaktan çıkarak sürekli bütçe, bakım ve yerel karar gerektiren bir kamu hizmetine dönüşür.",
        "İklim değişikliği nedeniyle deniz seviyesinin yükselmesi ve nehirlerde aşırı su miktarlarının daha sık görülmesi, mevcut sistemlerin sürekli yenilenmesini gerektirir. Hollanda’nın 2050 yılı için belirlediği temel hedef, setlerin arkasında yaşayan bir kişinin taşkın nedeniyle yaşamını kaybetme ihtimalini yılda 100.000’de 1’in altında tutmaktır. Ayrıca önümüzdeki yaklaşık 30 yıllık dönemde 1.400 kilometre setin ve 400 su kapağı ile pompa istasyonunun güçlendirilmesi planlanmaktadır. Hollanda’nın deniz seviyesinin altında yaşayabilmesi tek bir dev bariyerin başarısına değil; setlerin, pompaların, kanalların, kurumların ve uzun vadeli planların kesintisiz biçimde birlikte çalışmasına bağlıdır."
      ],
      "content": "Hollanda’nın suyla mücadelesi, yalnızca kıyıya set çekmekten ibaret değildir. Ülkenin yaklaşık üçte biri deniz seviyesinin altında bulunur; deniz, büyük göller ve nehirler birlikte düşünüldüğünde topraklarının yaklaşık yüzde 60’ı su baskınına uğrayabilecek alanlar içindedir. Rotterdam ve Amsterdam gibi büyük şehirlerin de bu bölgelerde bulunması, su yönetimini ülkenin günlük yaşamını sürdürebilmesi için zorunlu hâle getirir. Bu nedenle Hollanda, suyu tamamen uzaklaştırmaya çalışmak yerine onun seviyesini sürekli ölçen, yönlendiren ve gerektiğinde önünü kesen çok katmanlı bir sistem geliştirmiştir.\n\nBu sistemin temel parçalarından biri polderlerdir. Polder; denizden, gölden veya bataklıktan kazanılan ve çevresi setlerle çevrilen alçak arazidir. Setler dışarıdaki suyun içeri girmesini engellese de yağmur ve yer altı suları polderin içinde birikmeye devam eder. Bu yüzden kanallar aracılığıyla toplanan fazla suyun daha yüksek seviyedeki nehirlere ya da denize pompalanması gerekir. Geçmişte bu işi yel değirmenleri yaparken günümüzde elektrikli ve dizel pompa istasyonları kullanılır. UNESCO Dünya Mirası Listesi’ndeki Kinderdijk bölgesi; setleri, kanalları, değirmenleri, pompa istasyonları ve su kapaklarıyla bu tarihsel sistemin hâlâ görülebildiği önemli bir örnektir.\n\nHollanda’nın denize karşı en tanınmış savunması ise Delta Works adı verilen büyük mühendislik sistemidir. 1953’te yaşanan yıkıcı Kuzey Denizi taşkınının ardından geliştirilen bu sistem, 13 büyük taşkın koruma projesinden oluşur. Sistemin en önemli parçalarından Doğu Scheldt Bariyeri yaklaşık 9 kilometre uzunluğundadır; bunun yaklaşık 3 kilometrelik bölümü hareketli kapılarla kapatılabilir. Bariyer normal koşullarda açık tutularak gelgit hareketinin ve deniz ekosisteminin devamına izin verir, tehlikeli su seviyeleri ortaya çıktığında ise kapatılır. Yapımına 1976’da başlanmış ve çalışma 1986’da tamamlanmıştır.\n\nRotterdam Limanı’nı koruyan Maeslant Bariyeri de sistemin dikkat çekici yapılarındandır. Dünyadaki en büyük hareketli parçalara sahip su bariyerlerinden biri olan yapı, deniz seviyesinin yaklaşık 5 metre üzerine ulaşan fırtına kabarmalarına dayanacak biçimde tasarlanmıştır. Bu bariyerler sürekli kapalı tutulmaz; çünkü Hollanda’nın limanları, nehirleri ve denizle bağlantılı ekonomik yaşamı açık su yollarına ihtiyaç duyar. Bu nedenle amaç denizi dışarıda bırakmak değil, tehlike anında geçişi kontrollü biçimde durdurmaktır.\n\nSistemin işletilmesi yalnızca merkezî hükûmetin görevi değildir. Hollanda’da setlerin ve su kapaklarının bakımından, su seviyelerinin düzenlenmesinden ve atık suların arıtılmasından sorumlu 21 bölgesel su idaresi bulunur. Bu kurumların yönetiminde halk tarafından seçilen temsilciler görev yapar. Böylece su yönetimi, yalnızca mühendislerin yürüttüğü teknik bir çalışma olmaktan çıkarak sürekli bütçe, bakım ve yerel karar gerektiren bir kamu hizmetine dönüşür.\n\nİklim değişikliği nedeniyle deniz seviyesinin yükselmesi ve nehirlerde aşırı su miktarlarının daha sık görülmesi, mevcut sistemlerin sürekli yenilenmesini gerektirir. Hollanda’nın 2050 yılı için belirlediği temel hedef, setlerin arkasında yaşayan bir kişinin taşkın nedeniyle yaşamını kaybetme ihtimalini yılda 100.000’de 1’in altında tutmaktır. Ayrıca önümüzdeki yaklaşık 30 yıllık dönemde 1.400 kilometre setin ve 400 su kapağı ile pompa istasyonunun güçlendirilmesi planlanmaktadır. Hollanda’nın deniz seviyesinin altında yaşayabilmesi tek bir dev bariyerin başarısına değil; setlerin, pompaların, kanalların, kurumların ve uzun vadeli planların kesintisiz biçimde birlikte çalışmasına bağlıdır.",
      "wordCount": 444,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin yazılma amacı aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Hollanda’nın denizden kazandığı bütün tarım alanlarını karşılaştırmak"
            },
            {
              "key": "B",
              "text": "Hollanda’nın su baskını tehlikesine karşı geliştirdiği sistemi açıklamak"
            },
            {
              "key": "C",
              "text": "Avrupa ülkelerinin iklim değişikliğine karşı aldığı önlemleri sıralamak"
            },
            {
              "key": "D",
              "text": "Hollanda’daki limanların ekonomik önemini ayrıntılı biçimde anlatmak"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Polderlerde set bulunmasına rağmen pompalara ihtiyaç duyulmasının temel nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Deniz suyunun setlerin üzerinden sürekli aşması"
            },
            {
              "key": "B",
              "text": "Gemilerin kanallar içinde ilerleyebilmesi"
            },
            {
              "key": "C",
              "text": "Yağmur ve yer altı suyunun alçak arazide birikmesi"
            },
            {
              "key": "D",
              "text": "Değirmenlerin çevredeki rüzgârı azaltması"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Hollanda’nın 2050 yılı için belirlediği temel taşkın güvenliği hedefi aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Ölüm ihtimalini yılda 10.000’de 1’in altında tutmak"
            },
            {
              "key": "B",
              "text": "Ölüm ihtimalini yılda 50.000’de 1’in altında tutmak"
            },
            {
              "key": "C",
              "text": "Ölüm ihtimalini yılda 100.000’de 1’in altında tutmak"
            },
            {
              "key": "D",
              "text": "Ölüm ihtimalini yılda 1.000.000’da 1’in altında tutmak"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q4",
          "question": "Doğu Scheldt Bariyeri’nin normal koşullarda açık bırakılıp yalnızca tehlikeli su seviyelerinde kapatılması neyi göstermektedir?",
          "options": [
            {
              "key": "A",
              "text": "Taşkın güvenliğiyle deniz ekosistemi ve su ulaşımının birlikte düşünüldüğünü"
            },
            {
              "key": "B",
              "text": "Bariyerin yalnızca gemi geçişlerini hızlandırmak amacıyla yapıldığını"
            },
            {
              "key": "C",
              "text": "Hollanda’daki setlerin yüksek suya karşı yetersiz kaldığını"
            },
            {
              "key": "D",
              "text": "Gelgit hareketlerinin taşkın tehlikesini tamamen ortadan kaldırdığını"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q5",
          "question": "Metne göre Hollanda’nın su yönetiminde başarılı olmasının temel nedeni aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Bütün alçak bölgelerin yerleşime kapatılması"
            },
            {
              "key": "B",
              "text": "Suyun yalnızca büyük bariyerlerle denizden uzak tutulması"
            },
            {
              "key": "C",
              "text": "Su yönetiminin yalnızca yerel idarelere bırakılması"
            },
            {
              "key": "D",
              "text": "Farklı yapılar, kurumlar ve uzun vadeli planların birlikte işletilmesi"
            }
          ],
          "correctAnswer": "D"
        }
      ]
    },
    {
      "id": "grade-lise-text-08",
      "grade": "lise",
      "number": 8,
      "title": "İBN-İ SİNA’NIN TIP BİLİMİNE KATKILARI",
      "paragraphs": [
        "İbn-i Sina, yaklaşık 980 yılında Buhara yakınlarında doğduğu kabul edilen; tıp, felsefe, mantık ve doğa bilimleri üzerine çalışan çok yönlü bir bilgindi. Batı dünyasında “Avicenna” adıyla tanındı. Genç yaşta dönemin bilimsel birikimini incelemeye başlayan İbn-i Sina, hekimlik yaparken yalnızca önceki kitaplarda yer alan görüşleri aktarmadı; hastalar üzerinde yaptığı gözlemlerden ve uygulamalarından da yararlandı. 1037 yılında Hemedan’da hayatını kaybetmesine rağmen eserleri yüzyıllar boyunca hem İslam dünyasında hem de Avrupa’da etkili oldu.",
        "İbn-i Sina’nın tıp alanındaki en tanınmış eseri El-Kanun fi’t-Tıbb, yani Tıbbın Kanunu adlı çalışmasıdır. Beş kitaptan oluşan bu kapsamlı eserin ilk bölümünde tıbbın temel ilkeleri, insan bedeninin işleyişi, sağlığın korunması ve genel tedavi yöntemleri ele alınır. İkinci kitap bitkisel, hayvansal ve mineral kökenli ilaç maddelerine; üçüncü kitap organlara özgü hastalıklara ayrılmıştır. Dördüncü kitap ateşli hastalıklar, yaralanmalar ve bütün bedeni etkileyen rahatsızlıkları; beşinci kitap ise birden fazla maddeden hazırlanan ilaç karışımlarını inceler. Bu düzen, çok geniş bir tıp bilgisinin hekimlerin kolayca başvurabileceği sistemli bir kaynak hâline gelmesini sağlamıştır.",
        "İbn-i Sina’ya göre hekim, yalnızca hastalığın adını belirlemekle yetinmemeliydi. Hastanın nabzı, idrarı, beslenme biçimi, hareket düzeyi, uyku düzeni, yaşadığı çevre ve ruhsal durumu birlikte değerlendirilmeliydi. El-Kanun’da beslenme ve egzersizin sağlığın korunmasındaki yeri üzerinde durulması, tedavinin yalnızca ilaç vermekten ibaret görülmediğini gösterir. Hastalık ortaya çıkmadan önce sağlığı korumaya yönelik bu yaklaşım, eserin önemli yönlerinden biridir.",
        "İbn-i Sina, ilaçların etkisini değerlendirirken gelişigüzel sonuçlara güvenilmemesi gerektiğini de savundu. El-Kanun’un ikinci kitabında ilaçların sınanması için yedi ilke belirledi. İlacın başka maddelerin etkisinden uzak olması, belirli bir hastalık üzerinde denenmesi, uygun miktarda verilmesi ve sonucun farklı durumlarda yeniden gözlenmesi bu ilkeler arasındaydı. Elbette bu yöntemler günümüzdeki kontrollü klinik araştırmalarla aynı değildir. Ancak bir ilacın yararlı olduğuna karar vermeden önce şartların dikkatle belirlenmesi ve gözlemlerin tekrarlanması gerektiğini vurgulaması, tıp tarihinde önemli bir düşünce aşamasıdır.",
        "İbn-i Sina bazı hastalıkların insandan insana geçebileceğini, su ve çevre koşullarının hastalıkların yayılmasında rol oynayabileceğini belirtti. Özellikle verem gibi bulaşıcı hastalıklarda hastaların diğer insanlardan uzak tutulmasını önerdiği aktarılmaktadır. Bu görüşler, mikroorganizmaların henüz bilinmediği bir dönemde hastalıkların yalnızca kişinin bedenindeki değişikliklerle açıklanamayacağını fark etmesi bakımından dikkat çekicidir.",
        "El-Kanun, 12. yüzyılın ikinci yarısında Latinceye çevrildi. Eser, Avrupa’daki tıp eğitiminde 13. yüzyıldan itibaren yaygınlaştı ve bazı üniversitelerde 17. yüzyıla kadar temel kaynaklardan biri olarak kullanıldı. Bununla birlikte eserde yer alan her bilgi günümüz tıbbıyla uyumlu değildir; dönemin dört sıvı kuramı gibi bazı görüşleri daha sonra geçerliliğini kaybetmiştir. İbn-i Sina’nın kalıcı etkisi, yalnızca verdiği cevaplarda değil; tıp bilgisini düzenleme, gözlem sonuçlarını karşılaştırma ve hastayı bütün yaşam koşullarıyla değerlendirme biçiminde görülür."
      ],
      "content": "İbn-i Sina, yaklaşık 980 yılında Buhara yakınlarında doğduğu kabul edilen; tıp, felsefe, mantık ve doğa bilimleri üzerine çalışan çok yönlü bir bilgindi. Batı dünyasında “Avicenna” adıyla tanındı. Genç yaşta dönemin bilimsel birikimini incelemeye başlayan İbn-i Sina, hekimlik yaparken yalnızca önceki kitaplarda yer alan görüşleri aktarmadı; hastalar üzerinde yaptığı gözlemlerden ve uygulamalarından da yararlandı. 1037 yılında Hemedan’da hayatını kaybetmesine rağmen eserleri yüzyıllar boyunca hem İslam dünyasında hem de Avrupa’da etkili oldu.\n\nİbn-i Sina’nın tıp alanındaki en tanınmış eseri El-Kanun fi’t-Tıbb, yani Tıbbın Kanunu adlı çalışmasıdır. Beş kitaptan oluşan bu kapsamlı eserin ilk bölümünde tıbbın temel ilkeleri, insan bedeninin işleyişi, sağlığın korunması ve genel tedavi yöntemleri ele alınır. İkinci kitap bitkisel, hayvansal ve mineral kökenli ilaç maddelerine; üçüncü kitap organlara özgü hastalıklara ayrılmıştır. Dördüncü kitap ateşli hastalıklar, yaralanmalar ve bütün bedeni etkileyen rahatsızlıkları; beşinci kitap ise birden fazla maddeden hazırlanan ilaç karışımlarını inceler. Bu düzen, çok geniş bir tıp bilgisinin hekimlerin kolayca başvurabileceği sistemli bir kaynak hâline gelmesini sağlamıştır.\n\nİbn-i Sina’ya göre hekim, yalnızca hastalığın adını belirlemekle yetinmemeliydi. Hastanın nabzı, idrarı, beslenme biçimi, hareket düzeyi, uyku düzeni, yaşadığı çevre ve ruhsal durumu birlikte değerlendirilmeliydi. El-Kanun’da beslenme ve egzersizin sağlığın korunmasındaki yeri üzerinde durulması, tedavinin yalnızca ilaç vermekten ibaret görülmediğini gösterir. Hastalık ortaya çıkmadan önce sağlığı korumaya yönelik bu yaklaşım, eserin önemli yönlerinden biridir.\n\nİbn-i Sina, ilaçların etkisini değerlendirirken gelişigüzel sonuçlara güvenilmemesi gerektiğini de savundu. El-Kanun’un ikinci kitabında ilaçların sınanması için yedi ilke belirledi. İlacın başka maddelerin etkisinden uzak olması, belirli bir hastalık üzerinde denenmesi, uygun miktarda verilmesi ve sonucun farklı durumlarda yeniden gözlenmesi bu ilkeler arasındaydı. Elbette bu yöntemler günümüzdeki kontrollü klinik araştırmalarla aynı değildir. Ancak bir ilacın yararlı olduğuna karar vermeden önce şartların dikkatle belirlenmesi ve gözlemlerin tekrarlanması gerektiğini vurgulaması, tıp tarihinde önemli bir düşünce aşamasıdır.\n\nİbn-i Sina bazı hastalıkların insandan insana geçebileceğini, su ve çevre koşullarının hastalıkların yayılmasında rol oynayabileceğini belirtti. Özellikle verem gibi bulaşıcı hastalıklarda hastaların diğer insanlardan uzak tutulmasını önerdiği aktarılmaktadır. Bu görüşler, mikroorganizmaların henüz bilinmediği bir dönemde hastalıkların yalnızca kişinin bedenindeki değişikliklerle açıklanamayacağını fark etmesi bakımından dikkat çekicidir.\n\nEl-Kanun, 12. yüzyılın ikinci yarısında Latinceye çevrildi. Eser, Avrupa’daki tıp eğitiminde 13. yüzyıldan itibaren yaygınlaştı ve bazı üniversitelerde 17. yüzyıla kadar temel kaynaklardan biri olarak kullanıldı. Bununla birlikte eserde yer alan her bilgi günümüz tıbbıyla uyumlu değildir; dönemin dört sıvı kuramı gibi bazı görüşleri daha sonra geçerliliğini kaybetmiştir. İbn-i Sina’nın kalıcı etkisi, yalnızca verdiği cevaplarda değil; tıp bilgisini düzenleme, gözlem sonuçlarını karşılaştırma ve hastayı bütün yaşam koşullarıyla değerlendirme biçiminde görülür.",
      "wordCount": 401,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin ana düşüncesi aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "İbn-i Sina’nın tıp alanındaki önemi yalnızca çok sayıda eser yazmasından kaynaklanmaktadır."
            },
            {
              "key": "B",
              "text": "İbn-i Sina, tıp bilgisini sistemleştirip gözleme dayalı yöntemlerle geliştirerek uzun süreli bir etki oluşturmuştur."
            },
            {
              "key": "C",
              "text": "Günümüzde kullanılan bütün tedavi yöntemleri doğrudan İbn-i Sina tarafından geliştirilmiştir."
            },
            {
              "key": "D",
              "text": "İbn-i Sina’nın eserleri yalnızca yaşadığı coğrafyada tanınmış ve Avrupa’yı etkilememiştir."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "El-Kanun fi’t-Tıbb’ın hekimler için kullanışlı bir kaynak hâline gelmesini sağlayan temel özellik nedir?",
          "options": [
            {
              "key": "A",
              "text": "Bütün hastalıklar için tek bir tedavi önermesi"
            },
            {
              "key": "B",
              "text": "Tıp bilgilerini konularına göre düzenli bölümlere ayırması"
            },
            {
              "key": "C",
              "text": "Yalnızca İbn-i Sina’nın kendi hastalıklarını anlatması"
            },
            {
              "key": "D",
              "text": "İlaç kullanmadan uygulanabilecek yöntemlere yer vermesi"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q3",
          "question": "İbn-i Sina, ilaçların etkisini değerlendirmek için kaç ilke belirlemiştir?",
          "options": [
            {
              "key": "A",
              "text": "Beş"
            },
            {
              "key": "B",
              "text": "Altı"
            },
            {
              "key": "C",
              "text": "Yedi"
            },
            {
              "key": "D",
              "text": "Dokuz"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q4",
          "question": "İbn-i Sina’nın nabız, beslenme, uyku, çevre ve ruhsal durumu birlikte değerlendirmesi aşağıdakilerden hangisini göstermektedir?",
          "options": [
            {
              "key": "A",
              "text": "Hastalıkların yalnızca tek bir belirtiye bakılarak anlaşılabileceğini"
            },
            {
              "key": "B",
              "text": "Hastanın yaşam koşullarının tanı ve tedavi sürecinden ayrı tutulduğunu"
            },
            {
              "key": "C",
              "text": "Tedavinin yalnızca ilaçların özelliklerine göre belirlendiğini"
            },
            {
              "key": "D",
              "text": "Hastanın farklı özelliklerinin bir bütün olarak ele alındığını"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q5",
          "question": "El-Kanun’un yüzyıllarca tıp eğitiminde kullanılmasıyla ilgili aşağıdakilerden hangisi metne uygundur?",
          "options": [
            {
              "key": "A",
              "text": "Eserdeki bütün bilgilerin günümüzde de değişmeden geçerli olduğunu gösterir."
            },
            {
              "key": "B",
              "text": "Eserin sistemli yapısının ve geniş bilgi içeriğinin eğitimde değer gördüğünü gösterir."
            },
            {
              "key": "C",
              "text": "Avrupa’da İbn-i Sina’dan önce herhangi bir tıp çalışması yapılmadığını kanıtlar."
            },
            {
              "key": "D",
              "text": "Eserin Latinceye çevrilmeden önce Avrupa üniversitelerinde okutulduğunu gösterir."
            }
          ],
          "correctAnswer": "B"
        }
      ]
    },
    {
      "id": "grade-lise-text-09",
      "grade": "lise",
      "number": 9,
      "title": "KENAN SOFUOĞLU’NUN PİSTLERDEKİ BAŞARI YOLCULUĞU",
      "paragraphs": [
        "Kenan Sofuoğlu, 1984 yılında Sakarya’nın Akyazı ilçesinde dünyaya geldi. Motosiklet sporuna ilgi duyan bir aile ortamında büyüdü ve genç yaşlarda yarışmaya başladı. Ancak dünya şampiyonalarında mücadele etmek yalnızca hızlı motosiklet kullanmayı gerektirmiyordu. Bir yarışçı; fren noktalarını doğru belirlemeli, virajlara uygun açıyla girmeli, lastiklerin durumunu takip etmeli ve yarış boyunca dikkatini korumalıydı. Sofuoğlu da yıllar süren çalışmaları sırasında yalnızca hızını değil, motosikletin verdiği tepkileri okuyabilme becerisini geliştirdi.",
        "Dünya Supersport Şampiyonası’nda ilk kez 2003 yılında yarıştı. 2006’da Ten Kate Honda takımıyla tam sezon mücadele etmeye başladı ve 2007’de ilk dünya şampiyonluğunu kazandı. Ertesi yıl Dünya Superbike Şampiyonası’na geçti fakat bu sınıfta beklediği sonuçlara ulaşamadı. Daha güçlü motosikletlerin kullanıldığı yeni yarış ortamına uyum sağlamakta zorlanması, kariyerinin sona erdiği anlamına gelmedi. Supersport sınıfına döndü ve 2010’da ikinci kez dünya şampiyonu oldu. Daha sonra Moto2’de yarışsa da en büyük başarılarını, sürüş tarzına ve deneyimine daha uygun olan Supersport sınıfında elde etti.",
        "Sofuoğlu, 2012 yılında Kawasaki ile üçüncü şampiyonluğuna ulaştı. 2015 ve 2016 sezonlarında kazandığı iki şampiyonlukla birlikte Dünya Supersport tarihinde beş kez şampiyon olan ilk ve tek yarışçı oldu. Şampiyonluk yıllarının 2007, 2010, 2012, 2015 ve 2016 olması, başarısının tek bir döneme sıkışmadığını gösterir. Farklı takımlar ve motosikletlerle yarışmasına rağmen uzun yıllar boyunca üst düzey performans gösterebilmesi; teknik değişikliklere uyum sağlama, yarış stratejisi oluşturma ve baskı altında doğru karar verme becerileriyle bağlantılıydı.",
        "Bir motosiklet yarışında yalnızca en yüksek hıza ulaşmak yeterli değildir. Sporcu, bazı virajlarda rakibinden daha geç fren yaparak zaman kazanabilir fakat fren noktasını birkaç metre kaçırması pist dışına çıkmasına neden olabilir. Lastikleri yarışın ilk bölümünde aşırı zorlamak, son turlarda yol tutuşunun azalmasına yol açabilir. Bu nedenle Sofuoğlu, antrenmanlarda yalnızca hızlı tur atmaya değil, yarışın tamamını planlamaya önem veriyordu. Onu rakiplerinden ayıran yönlerden biri, motosikletindeki küçük değişimleri fark edip teknik ekibe ayrıntılı geri bildirim verebilmesiydi.",
        "Kariyeri boyunca 43 yarış galibiyeti, 85 podyum ve 34 pole pozisyonu elde etti. Bu rakamlar, Sofuoğlu’nun yalnızca zaman zaman kazanan bir sporcu olmadığını; uzun süre boyunca yarışların ön sıralarında kalabildiğini ortaya koyar. Dünya Supersport tarihindeki 43 galibiyetlik derecesi, yıllar sonra bile kategorinin en yüksek yarış kazanma sayısı olarak korunmuştur.",
        "Kariyerinin son döneminde başarılarının yanında ciddi sakatlıklarla da mücadele etti. 2017 sezonunun başında bileğinden sakatlandı. Aynı yıl Fransa’daki Magny-Cours pistinde geçirdiği kazada kalçasından ağır biçimde yaralandı. Henüz tam olarak iyileşmeden Katar’daki son yarışa döndü ve üçüncü olarak şampiyonluk mücadelesini sürdürdü. Ancak 2018’de geçirdiği başka bir kazanın ardından önceki sakatlığının etkilerinin devam ettiği anlaşıldı. Vücudunun verdiği uyarıları ve ailesinin kaygılarını dikkate alarak 33 yaşında profesyonel yarış kariyerini sonlandırdı.",
        "Sofuoğlu pistlerden ayrıldıktan sonra motosiklet sporuyla bağını koparmadı. Genç Türk yarışçıların yetişmesine destek vererek deneyimini yeni kuşaklara aktarmaya başladı. Böylece kariyerinde kazandığı bilgi, yalnızca kendi madalyalarıyla sınırlı kalmadı. Onun pistlerdeki yolculuğu; başarının kesintisiz ilerleyen bir çizgi olmadığını, sınıf değişiklikleri, sakatlıklar ve başarısız sonuçlar karşısında doğru alanı bulup yeniden çalışmanın da bu yolculuğun parçası olduğunu gösterdi."
      ],
      "content": "Kenan Sofuoğlu, 1984 yılında Sakarya’nın Akyazı ilçesinde dünyaya geldi. Motosiklet sporuna ilgi duyan bir aile ortamında büyüdü ve genç yaşlarda yarışmaya başladı. Ancak dünya şampiyonalarında mücadele etmek yalnızca hızlı motosiklet kullanmayı gerektirmiyordu. Bir yarışçı; fren noktalarını doğru belirlemeli, virajlara uygun açıyla girmeli, lastiklerin durumunu takip etmeli ve yarış boyunca dikkatini korumalıydı. Sofuoğlu da yıllar süren çalışmaları sırasında yalnızca hızını değil, motosikletin verdiği tepkileri okuyabilme becerisini geliştirdi.\n\nDünya Supersport Şampiyonası’nda ilk kez 2003 yılında yarıştı. 2006’da Ten Kate Honda takımıyla tam sezon mücadele etmeye başladı ve 2007’de ilk dünya şampiyonluğunu kazandı. Ertesi yıl Dünya Superbike Şampiyonası’na geçti fakat bu sınıfta beklediği sonuçlara ulaşamadı. Daha güçlü motosikletlerin kullanıldığı yeni yarış ortamına uyum sağlamakta zorlanması, kariyerinin sona erdiği anlamına gelmedi. Supersport sınıfına döndü ve 2010’da ikinci kez dünya şampiyonu oldu. Daha sonra Moto2’de yarışsa da en büyük başarılarını, sürüş tarzına ve deneyimine daha uygun olan Supersport sınıfında elde etti.\n\nSofuoğlu, 2012 yılında Kawasaki ile üçüncü şampiyonluğuna ulaştı. 2015 ve 2016 sezonlarında kazandığı iki şampiyonlukla birlikte Dünya Supersport tarihinde beş kez şampiyon olan ilk ve tek yarışçı oldu. Şampiyonluk yıllarının 2007, 2010, 2012, 2015 ve 2016 olması, başarısının tek bir döneme sıkışmadığını gösterir. Farklı takımlar ve motosikletlerle yarışmasına rağmen uzun yıllar boyunca üst düzey performans gösterebilmesi; teknik değişikliklere uyum sağlama, yarış stratejisi oluşturma ve baskı altında doğru karar verme becerileriyle bağlantılıydı.\n\nBir motosiklet yarışında yalnızca en yüksek hıza ulaşmak yeterli değildir. Sporcu, bazı virajlarda rakibinden daha geç fren yaparak zaman kazanabilir fakat fren noktasını birkaç metre kaçırması pist dışına çıkmasına neden olabilir. Lastikleri yarışın ilk bölümünde aşırı zorlamak, son turlarda yol tutuşunun azalmasına yol açabilir. Bu nedenle Sofuoğlu, antrenmanlarda yalnızca hızlı tur atmaya değil, yarışın tamamını planlamaya önem veriyordu. Onu rakiplerinden ayıran yönlerden biri, motosikletindeki küçük değişimleri fark edip teknik ekibe ayrıntılı geri bildirim verebilmesiydi.\n\nKariyeri boyunca 43 yarış galibiyeti, 85 podyum ve 34 pole pozisyonu elde etti. Bu rakamlar, Sofuoğlu’nun yalnızca zaman zaman kazanan bir sporcu olmadığını; uzun süre boyunca yarışların ön sıralarında kalabildiğini ortaya koyar. Dünya Supersport tarihindeki 43 galibiyetlik derecesi, yıllar sonra bile kategorinin en yüksek yarış kazanma sayısı olarak korunmuştur.\n\nKariyerinin son döneminde başarılarının yanında ciddi sakatlıklarla da mücadele etti. 2017 sezonunun başında bileğinden sakatlandı. Aynı yıl Fransa’daki Magny-Cours pistinde geçirdiği kazada kalçasından ağır biçimde yaralandı. Henüz tam olarak iyileşmeden Katar’daki son yarışa döndü ve üçüncü olarak şampiyonluk mücadelesini sürdürdü. Ancak 2018’de geçirdiği başka bir kazanın ardından önceki sakatlığının etkilerinin devam ettiği anlaşıldı. Vücudunun verdiği uyarıları ve ailesinin kaygılarını dikkate alarak 33 yaşında profesyonel yarış kariyerini sonlandırdı.\n\nSofuoğlu pistlerden ayrıldıktan sonra motosiklet sporuyla bağını koparmadı. Genç Türk yarışçıların yetişmesine destek vererek deneyimini yeni kuşaklara aktarmaya başladı. Böylece kariyerinde kazandığı bilgi, yalnızca kendi madalyalarıyla sınırlı kalmadı. Onun pistlerdeki yolculuğu; başarının kesintisiz ilerleyen bir çizgi olmadığını, sınıf değişiklikleri, sakatlıklar ve başarısız sonuçlar karşısında doğru alanı bulup yeniden çalışmanın da bu yolculuğun parçası olduğunu gösterdi.",
      "wordCount": 462,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin ana düşüncesi aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Motosiklet yarışlarında başarı, yalnızca yüksek hızlara ulaşabilmeye bağlıdır."
            },
            {
              "key": "B",
              "text": "Kenan Sofuoğlu, yeteneğini teknik çalışma ve kararlılıkla geliştirerek kalıcı başarılar elde etmiştir."
            },
            {
              "key": "C",
              "text": "Farklı yarış sınıflarında mücadele eden sporcular aynı sonuçlara ulaşır."
            },
            {
              "key": "D",
              "text": "Bir yarışçının kariyerinde karşılaştığı sakatlıklar başarılarını tamamen değersizleştirir."
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q2",
          "question": "Sofuoğlu’nun Dünya Superbike ve Moto2 deneyimlerinden sonra Supersport’a yönelmesi aşağıdakilerden hangisiyle açıklanabilir?",
          "options": [
            {
              "key": "A",
              "text": "Supersport yarışlarının teknik hazırlık gerektirmemesiyle"
            },
            {
              "key": "B",
              "text": "Diğer sınıflarda yarışmasına izin verilmemesiyle"
            },
            {
              "key": "C",
              "text": "Deneyimine ve sürüş özelliklerine daha uygun olan sınıfı seçmesiyle"
            },
            {
              "key": "D",
              "text": "Supersport motosikletlerinin diğerlerinden daha hızlı olmasıyla"
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q3",
          "question": "Aşağıdakilerden hangisi Kenan Sofuoğlu’nun kariyer istatistiklerini doğru vermektedir?",
          "options": [
            {
              "key": "A",
              "text": "43 galibiyet, 85 podyum ve 34 pole pozisyonu"
            },
            {
              "key": "B",
              "text": "34 galibiyet, 43 podyum ve 85 pole pozisyonu"
            },
            {
              "key": "C",
              "text": "43 galibiyet, 34 podyum ve 85 pole pozisyonu"
            },
            {
              "key": "D",
              "text": "85 galibiyet, 43 podyum ve 34 pole pozisyonu"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q4",
          "question": "Metinde fren noktaları ve lastik kullanımıyla ilgili açıklamalara yer verilmesinin temel nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Yarış başarısının hızın yanında teknik planlama ve doğru kararlar gerektirdiğini göstermek"
            },
            {
              "key": "B",
              "text": "Sofuoğlu’nun bütün yarışlarda aynı stratejiyi kullandığını kanıtlamak"
            },
            {
              "key": "C",
              "text": "Motosikletlerin teknik özelliklerinin yarışçıdan daha önemli olduğunu açıklamak"
            },
            {
              "key": "D",
              "text": "Yarışların sonucunun yalnızca lastiklerin kalitesine bağlı olduğunu göstermek"
            }
          ],
          "correctAnswer": "A"
        },
        {
          "id": "q5",
          "question": "Kenan Sofuoğlu’nun 2018 yılında yarış kariyerini sonlandırmasında aşağıdakilerden hangisi etkili olmuştur?",
          "options": [
            {
              "key": "A",
              "text": "Dünya Supersport Şampiyonası’nın sona ermesi"
            },
            {
              "key": "B",
              "text": "Takımının kendisiyle çalışmak istememesi"
            },
            {
              "key": "C",
              "text": "Genç yarışçılara karşı yarışmayı reddetmesi"
            },
            {
              "key": "D",
              "text": "Geçirdiği sakatlıkların fiziksel durumunu ve ailesini etkilemesi"
            }
          ],
          "correctAnswer": "D"
        }
      ]
    },
    {
      "id": "grade-lise-text-10",
      "grade": "lise",
      "number": 10,
      "title": "PLACEBO ETKİSİ BEYNİMİZİ NASIL ETKİLER?",
      "paragraphs": [
        "Placebo, etkili bir ilaç maddesi içermeyen ancak gerçek bir tedaviye benzeyecek biçimde sunulan uygulamadır. Şeker hapı, etkisiz krem ya da tedaviyi taklit eden bir işlem placebo olarak kullanılabilir. Buna karşın placebo etkisi, kişinin iyileştiğini yalnızca hayal etmesi anlamına gelmez. Tedaviye ilişkin beklenti, önceki deneyimler, hekimin yaklaşımı ve içinde bulunulan ortam; ağrı, bulantı, yorgunluk veya kaygı gibi belirtilerin algılanışını gerçekten değiştirebilir. Bu etki özellikle ağrı araştırmalarında ayrıntılı biçimde incelenmiştir.",
        "Beyin, vücuttan gelen ağrı sinyallerini edilgen bir alıcı gibi kaydetmez. Sinyalin anlamını; tehlike beklentisi, dikkat, korku ve geçmiş deneyimler gibi bilgilerle birlikte değerlendirir. Bir kişiye uygulanan kremin güçlü bir ağrı kesici olduğu söylendiğinde olumlu beklenti oluşabilir. Kişi daha önce benzer bir tedaviden rahatlama yaşamışsa koşullanma da devreye girer. Böylece beynin ön bölgeleri, ağrı ve duygusal değerlendirmeyle ilişkili ağlarla iletişim kurarak hissedilen ağrının şiddetini azaltabilir. Öğrenilen bilgiler ve kişiye verilen açıklamalar, aynı şiddetteki uyarının farklı düzeylerde ağrılı hissedilmesine yol açabilir.",
        "Bu süreçte beynin kendi ürettiği opioid benzeri maddeler de rol oynayabilir. Endojen opioid adı verilen bu maddeler, ağrı iletimini düzenleyen sistemleri etkiler. Görüntüleme araştırmalarında placebo uygulamasının ön singulat korteks, prefrontal korteks, insula ve talamus gibi bölgelerdeki etkinlikle ilişkili olduğu görülmüştür. Ancak placebo tek bir “beyin düğmesine” basmaz; beklenti, öğrenme, dikkat ve duyguların katıldığı birden fazla mekanizma birlikte çalışır. Bu nedenle aynı uygulama, farklı kişilerde aynı sonucu oluşturmayabilir.",
        "2021’de yayımlanan geniş bir incelemede, 20 ayrı beyin görüntüleme çalışmasındaki 603 sağlıklı katılımcının verileri birlikte değerlendirildi. Placebo uygulamalarının ağrıyla ilişkili bazı beyin bölgelerinde küçük fakat tutarlı etkinlik azalmaları oluşturduğu belirlendi. Buna rağmen sonuçlar kişiler ve çalışmalar arasında farklılık gösteriyordu. Bu bulgu, placebo etkisinin gerçek bir sinirsel karşılığı bulunduğunu ancak herkeste aynı güçte ve aynı yolla ortaya çıkmadığını göstermektedir.",
        "Beklentinin olumsuz yönde işlemesine ise nocebo etkisi denir. Bir kişi tedavinin ciddi yan etkilere yol açacağına inanırsa, etkisiz bir madde aldığı hâlde baş ağrısı, bulantı veya rahatsızlık bildirebilir. Önceden duyulan olumsuz bilgiler, kişinin bedenindeki normal değişimleri yan etki olarak yorumlamasına yol açabilir. Bu nedenle hekimin hastaya verdiği bilgi önemlidir: Riskler gizlenmemeli fakat korkuyu gereksiz biçimde artıran bir anlatımdan da kaçınılmalıdır.",
        "Placebo etkisinin sınırları vardır. Beklenti bazı belirtilerin hissedilme biçimini değiştirebilir; ancak bakterileri yok eden antibiyotiğin, kırık kemiği onaran müdahalenin veya tümörü hedefleyen tedavinin yerine geçmez. Ayrıca bir hastanın tedavi olmadan zamanla iyileşmesi, belirtilerin doğal olarak dalgalanması ve araştırmaya katıldığı için davranışlarını değiştirmesi doğrudan placebo etkisi değildir. Bu nedenle klinik deneylerde yeni bir tedavi placebo grubuyla karşılaştırılır. Böylece ilacın kendine özgü etkisi; beklenti, bakım ortamı ve hastalığın doğal seyri gibi etkenlerden ayrılmaya çalışılır.",
        "Placebo araştırmalarının asıl önemi, “Zihin her hastalığı iyileştirir.” sonucuna ulaşmak değildir. Bu çalışmalar, tedavinin yalnızca kullanılan ilaçtan oluşmadığını; güven, iletişim, beklenti ve öğrenmenin de hastanın deneyimini biçimlendirdiğini gösterir. Bu bilgi, etkili tedavileri bırakmak için değil, onların daha doğru ve insancıl bir ortamda nasıl uygulanabileceğini anlamak için kullanılmalıdır."
      ],
      "content": "Placebo, etkili bir ilaç maddesi içermeyen ancak gerçek bir tedaviye benzeyecek biçimde sunulan uygulamadır. Şeker hapı, etkisiz krem ya da tedaviyi taklit eden bir işlem placebo olarak kullanılabilir. Buna karşın placebo etkisi, kişinin iyileştiğini yalnızca hayal etmesi anlamına gelmez. Tedaviye ilişkin beklenti, önceki deneyimler, hekimin yaklaşımı ve içinde bulunulan ortam; ağrı, bulantı, yorgunluk veya kaygı gibi belirtilerin algılanışını gerçekten değiştirebilir. Bu etki özellikle ağrı araştırmalarında ayrıntılı biçimde incelenmiştir.\n\nBeyin, vücuttan gelen ağrı sinyallerini edilgen bir alıcı gibi kaydetmez. Sinyalin anlamını; tehlike beklentisi, dikkat, korku ve geçmiş deneyimler gibi bilgilerle birlikte değerlendirir. Bir kişiye uygulanan kremin güçlü bir ağrı kesici olduğu söylendiğinde olumlu beklenti oluşabilir. Kişi daha önce benzer bir tedaviden rahatlama yaşamışsa koşullanma da devreye girer. Böylece beynin ön bölgeleri, ağrı ve duygusal değerlendirmeyle ilişkili ağlarla iletişim kurarak hissedilen ağrının şiddetini azaltabilir. Öğrenilen bilgiler ve kişiye verilen açıklamalar, aynı şiddetteki uyarının farklı düzeylerde ağrılı hissedilmesine yol açabilir.\n\nBu süreçte beynin kendi ürettiği opioid benzeri maddeler de rol oynayabilir. Endojen opioid adı verilen bu maddeler, ağrı iletimini düzenleyen sistemleri etkiler. Görüntüleme araştırmalarında placebo uygulamasının ön singulat korteks, prefrontal korteks, insula ve talamus gibi bölgelerdeki etkinlikle ilişkili olduğu görülmüştür. Ancak placebo tek bir “beyin düğmesine” basmaz; beklenti, öğrenme, dikkat ve duyguların katıldığı birden fazla mekanizma birlikte çalışır. Bu nedenle aynı uygulama, farklı kişilerde aynı sonucu oluşturmayabilir.\n\n2021’de yayımlanan geniş bir incelemede, 20 ayrı beyin görüntüleme çalışmasındaki 603 sağlıklı katılımcının verileri birlikte değerlendirildi. Placebo uygulamalarının ağrıyla ilişkili bazı beyin bölgelerinde küçük fakat tutarlı etkinlik azalmaları oluşturduğu belirlendi. Buna rağmen sonuçlar kişiler ve çalışmalar arasında farklılık gösteriyordu. Bu bulgu, placebo etkisinin gerçek bir sinirsel karşılığı bulunduğunu ancak herkeste aynı güçte ve aynı yolla ortaya çıkmadığını göstermektedir.\n\nBeklentinin olumsuz yönde işlemesine ise nocebo etkisi denir. Bir kişi tedavinin ciddi yan etkilere yol açacağına inanırsa, etkisiz bir madde aldığı hâlde baş ağrısı, bulantı veya rahatsızlık bildirebilir. Önceden duyulan olumsuz bilgiler, kişinin bedenindeki normal değişimleri yan etki olarak yorumlamasına yol açabilir. Bu nedenle hekimin hastaya verdiği bilgi önemlidir: Riskler gizlenmemeli fakat korkuyu gereksiz biçimde artıran bir anlatımdan da kaçınılmalıdır.\n\nPlacebo etkisinin sınırları vardır. Beklenti bazı belirtilerin hissedilme biçimini değiştirebilir; ancak bakterileri yok eden antibiyotiğin, kırık kemiği onaran müdahalenin veya tümörü hedefleyen tedavinin yerine geçmez. Ayrıca bir hastanın tedavi olmadan zamanla iyileşmesi, belirtilerin doğal olarak dalgalanması ve araştırmaya katıldığı için davranışlarını değiştirmesi doğrudan placebo etkisi değildir. Bu nedenle klinik deneylerde yeni bir tedavi placebo grubuyla karşılaştırılır. Böylece ilacın kendine özgü etkisi; beklenti, bakım ortamı ve hastalığın doğal seyri gibi etkenlerden ayrılmaya çalışılır.\n\nPlacebo araştırmalarının asıl önemi, “Zihin her hastalığı iyileştirir.” sonucuna ulaşmak değildir. Bu çalışmalar, tedavinin yalnızca kullanılan ilaçtan oluşmadığını; güven, iletişim, beklenti ve öğrenmenin de hastanın deneyimini biçimlendirdiğini gösterir. Bu bilgi, etkili tedavileri bırakmak için değil, onların daha doğru ve insancıl bir ortamda nasıl uygulanabileceğini anlamak için kullanılmalıdır.",
      "wordCount": 451,
      "questions": [
        {
          "id": "q1",
          "question": "Bu metnin ana düşüncesi aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Placebo, ilaçların sağlayamadığı bütün fiziksel iyileşmeleri gerçekleştirebilir."
            },
            {
              "key": "B",
              "text": "Placebo etkisi yalnızca kişinin iyileştiğini düşünmesinden oluşan hayalî bir durumdur."
            },
            {
              "key": "C",
              "text": "Beklenti ve öğrenme bazı belirtileri gerçek beyin mekanizmalarıyla değiştirebilir ancak placebo etkisinin belirli sınırları vardır."
            },
            {
              "key": "D",
              "text": "Tıbbi tedavilerin etkili olabilmesi tamamen hastanın iyileşeceğine inanmasına bağlıdır."
            }
          ],
          "correctAnswer": "C"
        },
        {
          "id": "q2",
          "question": "Metne göre nocebo etkisi aşağıdakilerden hangisidir?",
          "options": [
            {
              "key": "A",
              "text": "Etkisiz bir uygulamanın olumlu beklenti nedeniyle belirtileri azaltması"
            },
            {
              "key": "B",
              "text": "Olumsuz beklentinin kişide rahatsızlık veya yan etki algısı oluşturması"
            },
            {
              "key": "C",
              "text": "Bir hastalığın herhangi bir tedavi uygulanmadan zamanla iyileşmesi"
            },
            {
              "key": "D",
              "text": "Etkili bir ilacın farklı hastalarda değişik sonuçlar meydana getirmesi"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q3",
          "question": "Placebo etkisini inceleyen 2021 tarihli araştırmada hangi veriler birlikte değerlendirilmiştir?",
          "options": [
            {
              "key": "A",
              "text": "18 çalışmadan 460 katılımcının verileri"
            },
            {
              "key": "B",
              "text": "20 çalışmadan 543 katılımcının verileri"
            },
            {
              "key": "C",
              "text": "28 çalışmadan 603 katılımcının verileri"
            },
            {
              "key": "D",
              "text": "20 çalışmadan 603 katılımcının verileri"
            }
          ],
          "correctAnswer": "D"
        },
        {
          "id": "q4",
          "question": "Yeni bir tedavinin klinik araştırmalarda placebo grubuyla karşılaştırılmasının temel nedeni nedir?",
          "options": [
            {
              "key": "A",
              "text": "Hastaların kullandıkları ilacın adını öğrenmesini sağlamak"
            },
            {
              "key": "B",
              "text": "İlacın etkisini beklenti ve hastalığın doğal seyri gibi etkenlerden ayırmak"
            },
            {
              "key": "C",
              "text": "Placebo grubundaki hastaların hiçbir değişiklik yaşamadığını kanıtlamak"
            },
            {
              "key": "D",
              "text": "Yeni tedavinin bütün hastalarda aynı sonucu verip vermediğini belirlemek"
            }
          ],
          "correctAnswer": "B"
        },
        {
          "id": "q5",
          "question": "Metinde beynin ağrı sinyallerini “edilgen bir alıcı gibi kaydetmediğinin” belirtilmesiyle anlatılmak istenen nedir?",
          "options": [
            {
              "key": "A",
              "text": "Beynin ağrı sinyallerini vücudun diğer bölümlerine aktarmadığı"
            },
            {
              "key": "B",
              "text": "Ağrının yalnızca kişinin düşünceleri sonucunda ortaya çıktığı"
            },
            {
              "key": "C",
              "text": "Beynin ağrı sinyalini beklenti ve geçmiş deneyimlerle birlikte değerlendirdiği"
            },
            {
              "key": "D",
              "text": "Ağrı hissinin ilaç kullanılmadan her zaman tamamen durdurulabildiği"
            }
          ],
          "correctAnswer": "C"
        }
      ]
    }
  ]
};

export const readingMeasurementTexts = Object.values(readingMeasurementTextsByGrade).flat();

export function normalizeReadingGradeKey(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");

  const aliases = {
    "3": "3",
    "3. sınıf": "3",
    "ilkokul 3": "3",
    "ilkokul 3. sınıf": "3",
    "4": "4",
    "4. sınıf": "4",
    "ilkokul 4": "4",
    "ilkokul 4. sınıf": "4",
    "5-6": "5-6",
    "5–6": "5-6",
    "5-6. sınıf": "5-6",
    "5–6. sınıf": "5-6",
    "ortaokul 5-6": "5-6",
    "ortaokul 5–6": "5-6",
    "7-8": "7-8",
    "7–8": "7-8",
    "7-8. sınıf": "7-8",
    "7–8. sınıf": "7-8",
    "ortaokul 7-8": "7-8",
    "ortaokul 7–8": "7-8",
    lise: "lise",
    "lise sınıfı": "lise",
  };

  return aliases[normalized] ?? null;
}

export function getReadingTextsForGrade(grade) {
  const key = normalizeReadingGradeKey(grade);
  return key ? readingMeasurementTextsByGrade[key] ?? [] : [];
}

export default readingMeasurementTextsByGrade;
