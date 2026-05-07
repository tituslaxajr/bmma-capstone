/* ═══════════════════════════════════════════════════════════════
   Manuscript Guide Data — STI BMMA Capstone Project 2
   Reference: GU-CRD-032-04 | STI Capstone Project Writing Manual
   Used by ManuscriptGuidePage.tsx
   ═══════════════════════════════════════════════════════════════ */

export interface ChapterSection {
  id: string;
  letter: string;
  title: string;
  description: string;
}

export interface ManuscriptChapter {
  number: number;
  title: string;
  summary: string;
  color: string;          // hex accent for this chapter
  colorDim: string;       // low-alpha background
  defenseEmphasis?: boolean;
  sections: ChapterSection[];
}

export const MANUSCRIPT_CHAPTERS: ManuscriptChapter[] = [
  {
    number: 1,
    title: "Introduction",
    summary: "This chapter establishes the context, problem, and theoretical basis for your project.",
    color: "#4D8FFF",
    colorDim: "rgba(77,143,255,0.10)",
    sections: [
      { id: "1a", letter: "A", title: "Project Context", description: "Presents the \"big picture\" of the problem, describing existing conditions or prevailing situations that necessitate the project." },
      { id: "1b", letter: "B", title: "Capstone Project Questions", description: "Specific, relevant questions that provide direction to the project and indicate what you aim to discover." },
      { id: "1c", letter: "C", title: "Objectives of the Project", description: "Describes the project's purpose, how it improves practice, and how the client or society will benefit." },
      { id: "1d", letter: "D", title: "Scope, Limitations, and Delimitations", description: "Defines the extent of the project, factors within its range, and boundaries such as location, time period, or population." },
      { id: "1e", letter: "E", title: "Review of Related Literature", description: "A synthesis of established ideas and prior research from published and unpublished materials related to your topic." },
      { id: "1f", letter: "F", title: "Theoretical / Conceptual Framework", description: "Defines the theory (Theoretical) or the researcher's explanation of concept relationships (Conceptual), often illustrated via a diagram." },
    ],
  },
  {
    number: 2,
    title: "Methodology",
    summary: "This chapter describes the techniques and processes used to gather data and develop the solution.",
    color: "#60A5FA",
    colorDim: "rgba(96,165,250,0.10)",
    sections: [
      { id: "2a", letter: "A", title: "Sample / Population", description: "Characteristics of the research subjects and the selection process for your surveys." },
      { id: "2b", letter: "B", title: "Data Gathering Tools", description: "Details the equipment and instruments used, such as pre- and post-survey questionnaires and interview guides." },
      { id: "2c", letter: "C", title: "Data Gathering Procedures", description: "Explains how surveys were conducted, how data was retrieved, and the statistical tests used for analysis." },
      { id: "2d", letter: "D", title: "Ethical Considerations", description: "Describes how you ensured the confidentiality and data privacy of your participants." },
      { id: "2e", letter: "E", title: "Development Components", description: "For multimedia projects, this includes Requirement Analysis (product features), Design, and Testing/Evaluation protocols." },
    ],
  },
  {
    number: 3,
    title: "Results",
    summary: "This chapter presents the gathered data using visuals to highlight values that answer your research questions.",
    color: "#4ADE80",
    colorDim: "rgba(74,222,128,0.10)",
    defenseEmphasis: true,
    sections: [
      { id: "3a", letter: "A", title: "Profile of Research Subjects", description: "Relevant demographic information about the participants." },
      { id: "3b", letter: "B", title: "Pre-Project Survey Results", description: "Presentation of baseline data (using tables and charts) gathered before implementation to establish the initial state of the problem." },
      { id: "3c", letter: "C", title: "Project Implementation", description: "Documentation of the actual deployment of your project. Includes the Implementation Plan (how the output was installed or screened) and Site-Specific Requirements (resources used for rollout, e.g., equipment or software)." },
      { id: "3d", letter: "D", title: "Post-Project Survey / Implementation Results", description: "Data gathered after implementation to serve as a ground for evaluating the project's success. Includes tabulated results and summarized evidence like direct quotations from transcripts." },
    ],
  },
  {
    number: 4,
    title: "Discussion",
    summary: "This chapter interprets the findings and provides the final significance of the work.",
    color: "#34D399",
    colorDim: "rgba(52,211,153,0.10)",
    defenseEmphasis: true,
    sections: [
      { id: "4a", letter: "A", title: "Interpretation of Data", description: "Explains what the data from Chapter III implies regarding the problem." },
      { id: "4b", letter: "B", title: "Clear Answers to Project Questions", description: "Provides the definitive answers to the questions posed in Chapter I." },
      { id: "4c", letter: "C", title: "Comparison with Literature", description: "Discusses how your results agree or disagree with other published works." },
      { id: "4d", letter: "D", title: "Closing Summary", description: "A final statement on the overall significance of the project output." },
      { id: "4e", letter: "E", title: "Recommendations", description: "Suggested improvements for implementation, ways to address limitations, and future research or technical enhancements." },
    ],
  },
];

export const FORMATTING_SPECS = [
  { label: "Paper Size", value: '8.5" x 11" white bond, substance 20+' },
  { label: "Font", value: "Times New Roman, 12pt" },
  { label: "Line Spacing", value: "1.5 throughout (except references and tables)" },
  { label: "Margins", value: 'Left 1.5" | Top / Right / Bottom 1"' },
  { label: "Alignment", value: "Fully justified" },
  { label: "Citation Style", value: "APA 7th Edition" },
  { label: "Page Numbers", value: "Upper right, starting from Chapter I" },
  { label: "Paragraph Indent", value: "0.5 inch first line" },
];

export const SUBMISSION_CHECKLIST = [
  { id: "sc-1", label: "Complete manuscript (Chapters I-IV) submitted to adviser" },
  { id: "sc-2", label: "Multimedia output / prototype completed" },
  { id: "sc-3", label: "Capstone Project Consultation Form signed by adviser" },
  { id: "sc-4", label: "BMMA Project and Content Development Brief endorsed" },
  { id: "sc-5", label: "Endorsed by Capstone Project Coordinator for Final Defense" },
  { id: "sc-6", label: "Defense fee paid to school cashier" },
];

export const DEFENSE_PREP_STEPS = [
  {
    step: 1,
    title: "Polish Chapters III & IV",
    description: "Focus your presentation on Results and Discussion/Output. Ensure pre/post-implementation data is complete and visualized.",
    icon: "edit",
  },
  {
    step: 2,
    title: "Finalize Your Multimedia Output",
    description: "Your output must reflect research-based creative decisions. Prepare documentation justifying design choices.",
    icon: "monitor",
  },
  {
    step: 3,
    title: "Prepare Your Presentation",
    description: "You have 30 minutes to present. Practice your flow.",
    icon: "presentation",
    timeline: [
      { label: "Ch. I–II (Brief) + Ch. III & IV", duration: "15 min", pct: 50 },
      { label: "Project Output", duration: "15 min", pct: 50 },
    ],
  },
  {
    step: 4,
    title: "Anticipate Panel Questions",
    description: "Panel Q&A = 1 hour. Know your methodology, data, and creative decisions inside out.",
    icon: "help",
  },
  {
    step: 5,
    title: "Dress Code & Logistics",
    description: "Wear corporate or business attire for the Final Defense. Arrive 15 minutes before your scheduled slot. Bring 1 hard copy of the manuscript + soft copy of the output.",
    icon: "briefcase",
  },
];

export const VERDICT_CHIPS = [
  { range: "92-100", label: "Pass", color: "#4ADE80", colorDim: "rgba(74,222,128,0.12)" },
  { range: "82-91", label: "Minor Revision", color: "#FBBF24", colorDim: "rgba(251,191,36,0.12)" },
  { range: "60-81", label: "Major Revision / Re-demonstration", color: "#FB923C", colorDim: "rgba(251,146,60,0.12)" },
  { range: "< 60", label: "Fail", color: "#F87171", colorDim: "rgba(248,113,113,0.12)" },
];

/* Legacy exports kept for backward compatibility */
export const APPENDICES = [
  { id: "app-a", title: "Project and Content Development Brief", description: "A mandated document for multimedia projects detailing the chosen medium, technical production standards, and creative development (pre-prod to post-prod)." },
  { id: "app-b", title: "Research Instrument", description: "Copies of your pre- and post-survey questionnaires or interview guides." },
  { id: "app-c", title: "Correspondence & Transcriptions", description: "Letters to clients, participants, or local authorities. Full records of interviews or focus group discussions (if applicable)." },
  { id: "app-d", title: "Gantt Chart of Activities", description: "The project's timeline and schedule." },
  { id: "app-e", title: "Actual Capstone Project Expenses", description: "A breakdown of costs incurred during the project." },
  { id: "app-f", title: "User's Manual / Guide", description: "Instructions for the client or audience on how to interact with the project or system." },
  { id: "app-g", title: "Client / Resource Person Information", description: "Contact details and profiles of project stakeholders." },
  { id: "app-h", title: "Certification of Originality Check", description: "Proof that the manuscript was checked for plagiarism." },
  { id: "app-i", title: "Certification of Editing", description: "Proof that the paper was professionally proofread." },
  { id: "app-j", title: "Certification of Statistical Treatment", description: "(If applicable) Validation from a statistician." },
  { id: "app-k", title: "Biographical Statement", description: "Short professional profiles of the researchers." },
  { id: "app-l", title: "Technical Attachments", description: "May include relevant source codes, sample input/output reports, or high-resolution screenshots of the final project." },
  { id: "app-m", title: "AI Declaration", description: "A one-page letter indicating the brevity and scope of AI usage." },
];

export const BEST_PRACTICES = [
  {
    category: "Writing & Formatting",
    items: [
      "Use Times New Roman 12pt, 1.5 line spacing, justified alignment",
      "Write in third person - avoid 'I', 'we', 'our'",
      "Use APA 7th edition for citations and references",
      "Number all pages, tables, and figures consecutively",
      "Keep paragraphs focused - one main idea per paragraph",
    ],
  },
  {
    category: "Content Quality",
    items: [
      "Every claim must be supported by a citation or data",
      "Compare at least 3 related studies in your literature review",
      "Include a conceptual framework diagram",
      "Align Chapter III results directly with Chapter I objectives",
      "Ensure Chapter IV conclusions answer the Capstone Project Questions",
    ],
  },
  {
    category: "Submission",
    items: [
      "Submit as a single PDF file with bookmarks for each chapter",
      "Include a title page, approval sheet, and table of contents",
      "Run spell-check and grammar-check before submitting",
      "Have a peer review your manuscript before the deadline",
      "Keep a backup copy of all files",
    ],
  },
];
