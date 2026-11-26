# G27 Ash–Growth Simulator (웹 버전)

산불 재 부하량(Mg/ha)이 흙물의 염(EC)을 거쳐 보리·강낭콩의 생장을 얼마나 줄이는지 보여 주는 웹 시뮬레이터입니다. 보리 실측 키로 보정한 **실험 전 vs 실험 후** 예측도 함께 볼 수 있습니다. 식과 숫자는 Colab 노트북 `G27_Ash_Growth_Simulator_v3.ipynb`와 같습니다(`tests/model.test.js`로 확인).

- 서버나 설치가 필요 없는 정적 사이트입니다. 외부 라이브러리·글꼴을 불러오지 않으므로 인터넷이 없어도 `index.html`을 더블클릭하면 열립니다.
- 한국어/영어 전환 버튼이 있습니다. 처음에는 브라우저 언어를 따릅니다.

## GitHub Pages에 올리기 (git 없이 웹에서)

1. GitHub에서 **New repository** → 이름 예: `g27-ash-simulator` → **Public** → **Create repository**.
   (무료 계정의 GitHub Pages는 Public 저장소에서만 쓸 수 있습니다.)
2. 새 저장소 화면의 **uploading an existing file**을 누르고, 이 폴더 **안의** 파일과 폴더를 모두 끌어다 놓습니다.
   `index.html`이 저장소 맨 위에 있어야 합니다. → **Commit changes**.
3. **Settings → Pages → Build and deployment**에서 Source를 **Deploy from a branch**, Branch를 **main / (root)** 로 고르고 **Save**.
4. 1~2분 뒤 Pages 화면 맨 위에 주소가 나옵니다: `https://<GitHub 아이디>.github.io/g27-ash-simulator/`
   이 주소로 포스터용 QR 코드를 만들면 됩니다.

`.nojekyll`은 숨김 파일이라 끌어다 놓을 때 빠질 수 있는데, 없어도 사이트는 똑같이 동작합니다.

## 재 양 (실험에서 넣은 값)

모종판 칸마다 넣은 재는 절차서 양(0.69 · 1.84 · 3.95 g)의 정확히 1/4인 **0.1725 · 0.46 · 0.9875 g**입니다(= 1.5 · 4.0 · 8.5 Mg/ha).
이 값은 `assets/data.js`의 `ASH_LEVELS`에 있고, 바꾸면 사이트 전체가 따라 바뀝니다.

보리 2차 실험(11/11, 지름 11 cm 화분 4개, 화분당 3알)은 강낭콩 2차와 같은 재(0 · 5.70 · 15.11 · 32.49 g = 0 · 6.0 · 15.9 · 34.2 Mg/ha)를 넣었습니다. 화분당 흙 64 g, 씨앗은 2 cm 깊이라 흙 깊이는 최소 2 cm입니다(실제 깊이는 재지 않음, 사이트에서 조절 막대로 바꿀 수 있음). 대조 화분에 싹이 나지 않아 보정에는 "모종판 + 화분"을 골랐을 때만 한계값(싹이 남 = 생장 0% 초과)으로 들어갑니다(`assets/data.js`의 `POT`).

## 폴더 구조

| 파일 | 내용 |
|---|---|
| `index.html` | 페이지 |
| `assets/data.js` | 입력값, 칸당 재 양(`ASH_LEVELS`), 보리 실측 키, 출처, 참고문헌 |
| `assets/model.js` | 모형 계산 (재 → EC → 생장, 실측 비율, 베이즈 보정) |
| `assets/app.js` | 화면과 그래프 (SVG, 외부 라이브러리 없음) |
| `assets/i18n.js` | 한국어·영어 문구 |
| `assets/style.css` | 디자인 |
| `tests/model.test.js` | 노트북 결과와 같은지 검사: `node tests/model.test.js` |

## 모형 요약

1. 칸당 재: m = L × A ÷ 100 (A = 3.4 × 3.4 cm)
2. 흙물 EC = 재 1:5 EC × 5m ÷ W × f + 상토 EC (W = 흙 부피 × 빈틈 비율 0.71)
3. 상대 생장 Y = 100 − b(EC − a) (Maas & Hoffman, 1977)
4. 실험 후: 실제로 넣은 재 양에서 11/6 보리 46포기의 대조 대비 키(log 척도, 세트 차이 제거)와 맞지 않는 유효 재 EC(= 재 EC × f)를 배제하고 다시 예측 (Gelman et al., 2013)
5. 결과: 가장 많이 넣은 재(8.5 Mg/ha)가 보리 감소가 시작되는 양(가장 나쁜 경우 약 15 Mg/ha)보다 적어, 실험 후 예측은 실험 전과 거의 같음

모든 입력값의 출처와 한계는 사이트의 "출처와 한계"에 있습니다.

---
Made by Group 27, USS Capstone, Hanyang University YK Intercollege (2026).
