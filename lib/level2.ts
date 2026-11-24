export const LEVEL2_TITLE = "Why Do Real Gases Deviate?";
export const LEVEL2_VERSION = 2 as const;
export const ANSWER_LIMIT = 4000;
export const choices = ["Increase", "Decrease", "Remain unchanged"] as const;

type Question = {
  title: string;
  instruction: string;
  prompt: string;
  attractions: boolean;
  finite: boolean;
  choice?: boolean;
  hints?: string[];
};

export type InvestigationKind = "temperature" | "density";

export const investigations: Record<InvestigationKind, Question[]> = {
  temperature: [
    {
      title: "Intermolecular Attractions",
      instruction: "Turn on intermolecular attractions and turn off finite molecular volume. Move the temperature slider from 600 K down to 300 K. Compare the magnitude of Deviation % at both temperatures.",
      prompt: "When only intermolecular attractions are included, does the magnitude of the percentage deviation increase, decrease, or remain unchanged as temperature decreases?",
      attractions: true,
      finite: false,
      choice: true,
    },
    {
      title: "Molecular Volume",
      instruction: "Turn off intermolecular attractions and turn on finite molecular volume. Move the temperature slider from 600 K down to 300 K again and compare the magnitude of Deviation %.",
      prompt: "When only molecular volume is included, does the magnitude of the percentage deviation increase, decrease, or remain unchanged as temperature decreases?",
      attractions: false,
      finite: true,
      choice: true,
    },
    {
      title: "Particle Motion",
      instruction: "Turn off both corrections. Increase the temperature from 300 K to 600 K and watch the particles move.",
      prompt: "According to KMT, how does the motion of gas particles change as temperature increases?",
      attractions: false,
      finite: false,
      hints: ["Think about the relationship between temperature, average kinetic energy, and particle speed."],
    },
    {
      title: "Explanation",
      instruction: "Turn on intermolecular attractions only. Compare the particle motion and Deviation % at 300 K and 600 K. Use your observations from Q1 and Q3.",
      prompt: "Why does the effect of intermolecular attractions lead to a greater percentage deviation from ideal pressure at lower temperatures?",
      attractions: true,
      finite: false,
      hints: ["Under the same attractive force, is it easier to change the motion of a fast-moving particle or a slow-moving particle?"],
    },
  ],
  density: [
    {
      title: "Intermolecular Attractions",
      instruction: "Turn on intermolecular attractions and turn off finite molecular volume. Move the gas density slider from its lowest to its highest value and compare the magnitude of Deviation %.",
      prompt: "When only intermolecular attractions are included, does the magnitude of the percentage deviation increase, decrease, or remain unchanged as gas density increases?",
      attractions: true,
      finite: false,
      choice: true,
    },
    {
      title: "Molecular Volume",
      instruction: "Turn off intermolecular attractions and turn on finite molecular volume. Increase the gas density again and compare the magnitude of Deviation %.",
      prompt: "When only molecular volume is included, does the magnitude of the percentage deviation increase, decrease, or remain unchanged as gas density increases?",
      attractions: false,
      finite: true,
      choice: true,
    },
    {
      title: "Particle Separation",
      instruction: "Turn off both corrections. Increase the gas density and watch the spacing between particles as the chamber shrinks.",
      prompt: "As gas density increases, does the average distance between gas particles increase, decrease, or remain unchanged?",
      attractions: false,
      finite: false,
      choice: true,
      hints: ["Think about the same number of gas particles occupying a smaller volume."],
    },
    {
      title: "Explanation",
      instruction: "Repeat the density sweep with only intermolecular attractions on, then with only finite molecular volume on. Use your observations from Q1–Q3 to explain both results.",
      prompt: "Why do both intermolecular attractions and molecular volume lead to greater percentage deviations from ideal pressure at higher gas densities when their effects are considered separately?",
      attractions: true,
      finite: false,
      hints: [
        "How does the attractive force between gas particles change as the distance between them decreases?",
        "As the container volume decreases, does the volume occupied by gas particles become a larger or smaller fraction of the container volume?",
      ],
    },
  ],
};

export const legacyQuestionTitles: Record<InvestigationKind, string[]> = {
  temperature: ["Temperature effect", "Particle motion", "Explanation"],
  density: ["Particle spacing", "Attractions", "Molecular volume"],
};

export function validLevel2Draft(kind: InvestigationKind, answers: unknown): answers is string[] {
  const questions = investigations[kind];
  return Array.isArray(answers) && answers.length === questions.length &&
    answers.every((answer, index) =>
      typeof answer === "string" && answer.length <= ANSWER_LIMIT &&
      (!questions[index].choice || answer === "" || choices.some((choice) => choice === answer)),
    );
}
