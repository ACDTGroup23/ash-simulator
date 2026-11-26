# G27 Ash–Growth Simulator (웹 버전)

산불 재 부하량(Mg/ha)이 흙물의 염(EC)을 거쳐 보리·강낭콩의 생장을 얼마나 줄이는지 보여 주는 웹 시뮬레이터입니다. 보리 실측 키로 보정한 **실험 전 vs 실험 후** 예측도 함께 볼 수 있습니다. 식과 숫자는 Colab 노트북 `G27_Ash_Growth_Simulator_v2.ipynb`와 같습니다(`tests/model.test.js`로 확인).

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

## 재 1꼬집 무게를 넣는 법

팀이 재를 실험할 때처럼 집어 저울로 여러 번 잰 뒤, `assets/data.js` 맨 위의 한 줄만 고칩니다.
GitHub에서 파일을 열고 연필 아이콘(Edit)을 누르면 됩니다.

```js
const MEASURED_PINCH = { g: 0.25, sd: 0.04, note: '11/27, 안상현, 10회 측정' };   // 예시 값입니다
```

저장(Commit)하고 1분쯤 지나면 사이트에 반영됩니다. 그때부터 실험 후 예측의 기본값이 실측값이 되고, 상태 표시가 "팀 실측"으로 바뀝니다.

## 폴더 구조

| 파일 | 내용 |
|---|---|
| `index.html` | 페이지 |
| `assets/data.js` | 입력값, 보리 실측 키, 출처, 참고문헌 (**꼬집 무게는 여기**) |
| `assets/model.js` | 모형 계산 (재 → EC → 생장, 실측 비율, 베이즈 보정) |
| `assets/app.js` | 화면과 그래프 (SVG, 외부 라이브러리 없음) |
| `assets/i18n.js` | 한국어·영어 문구 |
| `assets/style.css` | 디자인 |
| `tests/model.test.js` | 노트북 결과와 같은지 검사: `node tests/model.test.js` |

## 모형 요약

1. 칸당 재: m = L × A ÷ 100 (A = 3.4 × 3.4 cm)
2. 흙물 EC = 재 1:5 EC × 5m ÷ W × f + 상토 EC (W = 흙 부피 × 빈틈 비율 0.71)
3. 상대 생장 Y = 100 − b(EC − a) (Maas & Hoffman, 1977)
4. 실험 후: 11/6 보리 46포기의 대조 대비 키(log 척도, 세트 차이 제거)로 유효 재 EC(= 재 EC × f)의 범위를 좁힘 (Gelman et al., 2013)

모든 입력값의 출처와 한계는 사이트의 "출처와 한계"에 있습니다.

---
Made by Group 27, USS Capstone, Hanyang University YK Intercollege (2026).
