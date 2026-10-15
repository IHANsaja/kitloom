import { PurlPixels } from "@/components/pet/PurlSprite";
import { HEIGHT, WIDTH, type Pose } from "@/components/pet/sprites";

const STEP_A: Pose = { face: "lookRight", ears: "down", legs: "stepA", puff: false, lying: false };
const STEP_B: Pose = { face: "lookRight", ears: "down", legs: "stepB", puff: false, lying: false };
const ARRIVED: Pose = { face: "happy", ears: "wiggle", legs: "stand", puff: false, lying: false };

/**
 * The first-visit preloader: Purl trots across, unwinding a lime yarn behind it, hops when
 * it arrives, and the curtain lifts. Pure CSS (globals.css, "Purl preloader"), so it plays
 * before any script loads and always leaves on its own after about 1.6s, scripts or not.
 * It never takes pointer events, shows once per browser session (the root layout's inline
 * script marks it seen), and does not appear at all with reduced motion.
 */
export function PurlPreloader() {
  return (
    <div aria-hidden="true" className="kl-preloader">
      <div className="kl-pre-track" style={{ height: HEIGHT }}>
        <span className="kl-pre-yarn" />
        <span className="kl-pre-runner" style={{ width: WIDTH, height: HEIGHT }}>
          <span className="kl-pre-walk">
            <PurlPixels pose={STEP_A} className="kl-pre-a absolute inset-0" />
            <PurlPixels pose={STEP_B} className="kl-pre-b absolute inset-0" />
          </span>
          <PurlPixels pose={ARRIVED} className="kl-pre-arrived absolute inset-0" />
        </span>
      </div>
      <p className="kl-pre-word">kitloom</p>
    </div>
  );
}
