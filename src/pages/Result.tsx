import "./Result.css"


import MbtiPic from "../components/Mbtipic/Mbtipic";
import ProfileRadar from "../components/ProfileRader/ProfileRader";
import CommentBox from "../components/CommentBox/CommentBox";

export default function ResultPage() {
  // デモ用データ（裏から result:update で差し替えOK）
  const badges = ["Planning", "Introvert"];
  const markdown = `# Your Personality Snapshot
(placeholder)

- **Plan**
- **Explore**
- **Focus**`;

  const now = {
    label: "Now",
    points: [
      { axis: "Energy", value: 70 },
      { axis: "Mind", value: 45 },
      { axis: "Nature", value: 65 },
      { axis: "Tactics", value: 35 },
      { axis: "Identity", value: 55 },
    ],
  };
  const history = [
    {
      label: "Prev",
      points: [
        { axis: "Energy", value: 60 },
        { axis: "Mind", value: 50 },
        { axis: "Nature", value: 60 },
        { axis: "Tactics", value: 40 },
        { axis: "Identity", value: 50 },
      ],
    },
  ];

  return (
    < div className = "result-layout theme-ana" >
      <header className="rl-header">
        <div className="title-wrap">
          <h1 className="title">Result</h1>
        </div>
        <p className="muted">
          UI only. Your background code can update this page via custom events.
        </p>
      </header>

  {/* 左上：MbtiPic */ }
  <section className="card grid-left-top">
    <MbtiPic markdown={markdown} badges={badges} />
  </section>

  {/* 左下：Radar */ }
  <section className="card grid-left-bottom">
    <ProfileRadar now={now} history={history} />
  </section>

  {/* 右：コメント */ }
  <section className="card grid-right">
    <CommentBox />
  </section>
    </div >
  );
}
