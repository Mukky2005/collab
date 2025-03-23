import { useState } from 'react';
import { Book, FileText, GraduationCap, Microscope, Dna, HeartPulse, ChartBar, FileSpreadsheet } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ResearchTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: string;
}

interface ResearchTemplatesProps {
  onSelectTemplate: (templateId: string) => void;
}

export function ResearchTemplates({ onSelectTemplate }: ResearchTemplatesProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  const createFromTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error("Template not found");
      
      const res = await apiRequest("POST", "/api/documents", {
        title: `${template.title} Draft`,
        content: template.content
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      window.location.href = `/documents/${data.id}`;
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating document",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    createFromTemplateMutation.mutate(templateId);
  };
  
  const templates: ResearchTemplate[] = [
    {
      id: 'ieee',
      title: 'IEEE Conference Paper',
      description: 'Standard IEEE format for conference proceedings',
      icon: <FileText className="h-10 w-10 text-blue-600" />,
      content: `<h1>Title of Paper</h1>
<p>Author Name<sup>1</sup>, Co-Author Name<sup>2</sup><br>
<i>1 Department, Institution</i><br>
<i>2 Department, Institution</i><br>
Email: author@example.com</p>

<h2>Abstract</h2>
<p>This document provides a template for IEEE conference papers. The abstract should be concise and should summarize the content of the paper. The abstract should state the principal objectives and scope of the investigation and the methodology employed. The abstract should also summarize the results and their significance.</p>

<h2>I. Introduction</h2>
<p>The introduction should provide a clear statement of the problem, the relevant literature on the subject, and the proposed approach or solution. The background of the study and how it relates to other studies in the field should also be clearly stated. The introduction should not include results or conclusions.</p>

<h2>II. Methodology</h2>
<p>This section should provide sufficient detail about the methodology used in the study. The methodology section should include:</p>
<p>A. Data collection methods</p>
<p>B. Experimental procedures</p>
<p>C. Statistical methods</p>

<h2>III. Results</h2>
<p>The results should be presented clearly and precisely. Tables and figures may be used to present the data. All tables and figures should be cited in the text and numbered consecutively.</p>

<h2>IV. Discussion</h2>
<p>The discussion should interpret the results in the context of the original hypothesis. The discussion should also compare the results to previously published work.</p>

<h2>V. Conclusion</h2>
<p>The conclusion should summarize the major findings of the study and suggest future research directions.</p>

<h2>References</h2>
<p>[1] A. Author, "Title of the paper," Journal Name, vol. 1, no. 1, pp. 1-10, 2023.</p>
<p>[2] B. Author, "Title of the book," Publisher, 2023.</p>`
    },
    {
      id: 'apa',
      title: 'APA Research Paper',
      description: 'APA 7th edition format for research papers',
      icon: <Book className="h-10 w-10 text-green-600" />,
      content: `<h1 style="text-align: center;">Title of Paper</h1>
<p style="text-align: center;">Author Name<br>
Department, Institution<br>
Course Information<br>
Instructor Name<br>
Assignment Due Date</p>

<h2>Abstract</h2>
<p>This is an abstract for an APA style research paper. The abstract is a brief, comprehensive summary of the contents of the paper. A well-written abstract uses plain language and avoids specialized terminology. It should be accurate, concise, coherent, and readable. The abstract should be a single paragraph of 150-250 words.</p>

<h2>Introduction</h2>
<p>The introduction presents the problem that the paper addresses. It provides the context or background for the study and establishes its importance. The introduction should review the relevant literature, state the objective of the work, and state the hypothesis or research question.</p>

<h2>Method</h2>
<p>The method section describes in detail how the study was conducted. This section should include:</p>
<p><strong>Participants:</strong> Describe the participant characteristics, including demographic information and how they were recruited.</p>
<p><strong>Materials:</strong> Describe the materials, equipment, tests, or questionnaires used in the study.</p>
<p><strong>Procedure:</strong> Describe each step in the execution of the research, including participant instructions, experimental manipulations, and data collection procedures.</p>

<h2>Results</h2>
<p>The results section presents the findings of the study. It includes statistical analysis of the data and any tables or figures that illustrate the findings. The results section should present the findings without interpretation.</p>

<h2>Discussion</h2>
<p>The discussion section interprets the results, explains how they relate to the research question, and situates them within the broader literature. It should also address limitations of the study and suggest directions for future research.</p>

<h2>Conclusion</h2>
<p>The conclusion summarizes the key findings of the study and their implications. It should not introduce new information but rather synthesize what has already been presented.</p>

<h2>References</h2>
<p>Author, A. A., & Author, B. B. (Year). Title of the article. <i>Title of Journal</i>, <i>Volume</i>(Issue), Pages. DOI</p>
<p>Author, C. C. (Year). <i>Title of book</i>. Publisher.</p>`
    },
    {
      id: 'mla',
      title: 'MLA Research Paper',
      description: 'MLA 9th edition format for humanities',
      icon: <GraduationCap className="h-10 w-10 text-purple-600" />,
      content: `<p>Author Name</p>
<p>Professor Name</p>
<p>Course Name</p>
<p>Date (Day Month Year)</p>

<h1 style="text-align: center;">Title of Paper</h1>

<p>The MLA style is commonly used in humanities, especially in disciplines such as English, literature, and cultural studies. This template provides a basic structure for an MLA formatted research paper. The first paragraph of your paper should introduce your topic and provide a roadmap for the reader. Unlike some other citation styles, MLA does not require a separate title page or abstract.</p>

<p>The body of your paper should develop your arguments and provide evidence from both primary and secondary sources. Each paragraph should begin with a clear topic sentence that connects to your thesis. When you quote or paraphrase from a source, you should include an in-text citation in the following format: (Author's Last Name Page Number). For example, (Smith 42).</p>

<p>MLA style emphasizes the importance of analyzing and interpreting primary texts. When analyzing a literary work, you should provide specific examples from the text and explain their significance. For longer quotes (more than four lines of prose or three lines of poetry), you should format them as block quotes by indenting the entire quote one inch from the left margin.</p>

<h2>Section Heading</h2>

<p>In MLA style, section headings are optional but can be useful for organizing longer papers. If you use section headings, they should be descriptive and parallel in structure. They can be centered or aligned to the left, but should be consistent throughout the paper.</p>

<p>The conclusion of your paper should summarize your main points and explain the significance of your argument. It should not simply restate your thesis, but rather reflect on the implications of your findings.</p>

<h2>Works Cited</h2>

<p>Author's Last Name, First Name. <i>Title of Book</i>. Publisher, Year.</p>

<p>Author's Last Name, First Name. "Title of Article." <i>Title of Journal</i>, vol. #, no. #, Year, pp. Page Range. Database Name, DOI or URL.</p>

<p>Website Name. "Title of Web Page." Publisher or Sponsor, Date of Publication, URL. Accessed Day Month Year.</p>`
    },
    {
      id: 'scientific',
      title: 'Scientific Research Article',
      description: 'IMRAD format for scientific publications',
      icon: <Microscope className="h-10 w-10 text-red-600" />,
      content: `<h1>Title of Research Article</h1>
<p>Author Name<sup>1</sup>, Co-Author Name<sup>2</sup><br>
<i>1 Department, Institution, City, Country</i><br>
<i>2 Department, Institution, City, Country</i><br>
Email: corresponding.author@example.com</p>

<h2>Abstract</h2>
<p>This scientific research article follows the IMRAD format (Introduction, Methods, Results, and Discussion). The abstract should provide a brief summary of the paper, including the research question, the methodology, the key findings, and the main conclusions. The abstract should be around 150-250 words and should not contain citations.</p>

<h2>Keywords</h2>
<p>keyword1; keyword2; keyword3; keyword4; keyword5</p>

<h2>Introduction</h2>
<p>The introduction should provide the background and context for the research. It should present the research question or problem being addressed and its significance. The introduction should also review relevant literature to situate the current study within the existing body of knowledge. Finally, it should clearly state the objectives or hypotheses of the study.</p>

<h2>Materials and Methods</h2>
<p>This section should describe, in detail, how the study was conducted. It should include:</p>
<p>- Study design</p>
<p>- Participant/sample selection and characteristics</p>
<p>- Data collection procedures</p>
<p>- Analytical methods, including statistical techniques</p>
<p>- Ethical considerations</p>
<p>The methods should be described with sufficient detail to allow other researchers to replicate the study.</p>

<h2>Results</h2>
<p>The results section should present the findings of the study without interpretation. It should include:</p>
<p>- Primary outcomes</p>
<p>- Secondary outcomes</p>
<p>- Any unexpected findings</p>
<p>Tables, figures, and graphs can be used to present data more clearly. Each table or figure should be numbered and have a descriptive caption.</p>

<h2>Discussion</h2>
<p>The discussion should interpret the results in the context of the research question and existing literature. It should address:</p>
<p>- How the findings confirm or contradict previous research</p>
<p>- The limitations of the study</p>
<p>- The implications of the findings for theory, practice, or policy</p>
<p>- Recommendations for future research</p>

<h2>Conclusion</h2>
<p>The conclusion should summarize the key findings and their significance without introducing new information. It should reinforce the main message of the paper.</p>

<h2>Acknowledgments</h2>
<p>This section acknowledges any funding sources, technical assistance, or other contributions that do not merit authorship.</p>

<h2>References</h2>
<p>References should be formatted according to the specific journal or publication guidelines. Here is a general format:</p>
<p>1. Author A, Author B. Title of the article. Journal Name. Year;Volume(Issue):Pages.</p>
<p>2. Author C, Author D. Title of the book. Publisher; Year.</p>`
    },
    {
      id: 'biomedical',
      title: 'Biomedical Research Paper',
      description: 'Format for biomedical research publications',
      icon: <Dna className="h-10 w-10 text-pink-600" />,
      content: `<h1>Title of Biomedical Research Paper</h1>
<p>Author Name<sup>1</sup>, Co-Author Name<sup>2</sup>, Additional Author<sup>1</sup><br>
<i>1 Department, Institution, City, Country</i><br>
<i>2 Department, Institution, City, Country</i><br>
Email: corresponding.author@example.com</p>

<h2>Abstract</h2>
<p>This template follows the standard format for biomedical research papers. The abstract should provide a comprehensive summary of the paper, including background, objectives, methods, results, and conclusions. The abstract should be around 250-300 words for most biomedical journals.</p>

<h2>Keywords</h2>
<p>biomedical; research; methodology; disease; treatment</p>

<h2>Introduction</h2>
<p>The introduction should provide the context and background for the study, including relevant literature and the gaps in knowledge that the study aims to address. It should clearly state the objectives or hypotheses of the research and its potential significance for biomedical science or clinical practice.</p>

<h2>Methods</h2>
<p><strong>Study Design and Participants</strong></p>
<p>Describe the study design (e.g., randomized controlled trial, cohort study, case-control study) and the criteria for participant inclusion and exclusion. Include details of ethical approval and informed consent procedures.</p>

<p><strong>Interventions/Exposures</strong></p>
<p>For experimental studies, describe the interventions in detail, including how and when they were administered. For observational studies, define the exposures of interest.</p>

<p><strong>Outcome Measures</strong></p>
<p>Define the primary and secondary outcome measures, including how and when they were assessed.</p>

<p><strong>Data Collection and Analysis</strong></p>
<p>Describe the methods used for data collection and the statistical analyses performed, including sample size calculations, handling of missing data, and any software used.</p>

<h2>Results</h2>
<p><strong>Participant Characteristics</strong></p>
<p>Describe the demographic and baseline clinical characteristics of the study participants.</p>

<p><strong>Primary Outcomes</strong></p>
<p>Present the results for the primary outcome measures, including effect sizes, confidence intervals, and p-values where appropriate.</p>

<p><strong>Secondary Outcomes</strong></p>
<p>Present the results for the secondary outcome measures.</p>

<p><strong>Adverse Events</strong></p>
<p>For clinical studies, report any adverse events or complications.</p>

<h2>Discussion</h2>
<p><strong>Summary of Findings</strong></p>
<p>Summarize the main findings in relation to the study objectives or hypotheses.</p>

<p><strong>Comparison with Existing Literature</strong></p>
<p>Discuss how the findings compare with previous studies and current understanding in the field.</p>

<p><strong>Strengths and Limitations</strong></p>
<p>Discuss the strengths and limitations of the study, including potential biases and their impact on the findings.</p>

<p><strong>Implications</strong></p>
<p>Discuss the implications of the findings for biomedical science, clinical practice, and policy.</p>

<p><strong>Future Research</strong></p>
<p>Suggest directions for future research based on the findings of this study.</p>

<h2>Conclusion</h2>
<p>The conclusion should summarize the key findings and their significance for biomedical science or clinical practice.</p>

<h2>Acknowledgments</h2>
<p>Acknowledge any funding sources, contributions from non-authors, and any conflicts of interest.</p>

<h2>References</h2>
<p>1. Author A, Author B, Author C, et al. Title of the article. Journal Name. Year;Volume(Issue):Pages.</p>
<p>2. Author D, Author E. Title of the book chapter. In: Editor F, Editor G, eds. Title of the Book. Publisher; Year:Pages.</p>`
    },
    {
      id: 'clinical',
      title: 'Clinical Trial Report',
      description: 'CONSORT format for clinical trials',
      icon: <HeartPulse className="h-10 w-10 text-red-500" />,
      content: `<h1>Title of Clinical Trial</h1>
<p>Author Name<sup>1</sup>, Co-Author Name<sup>2</sup>, Additional Author<sup>3</sup><br>
<i>1 Department, Institution, City, Country</i><br>
<i>2 Department, Institution, City, Country</i><br>
<i>3 Department, Institution, City, Country</i><br>
Email: corresponding.author@example.com</p>

<h2>Abstract</h2>
<p><strong>Background:</strong> Provide a brief context for the trial and its objectives.</p>
<p><strong>Methods:</strong> Describe the trial design, participants, interventions, and primary outcome measures.</p>
<p><strong>Results:</strong> Summarize the main results, including effect sizes and precision (e.g., 95% confidence interval).</p>
<p><strong>Conclusions:</strong> State the main conclusions and implications for practice.</p>
<p><strong>Trial Registration:</strong> Provide the trial registration number and registry name.</p>
<p><strong>Funding:</strong> Identify the funding source(s).</p>

<h2>Introduction</h2>
<p><strong>Background and Rationale</strong></p>
<p>Explain the scientific background and rationale for the trial. Include a summary of relevant studies and gaps in current knowledge.</p>

<p><strong>Objectives</strong></p>
<p>State the specific objectives or hypotheses of the trial.</p>

<h2>Methods</h2>
<p><strong>Trial Design</strong></p>
<p>Describe the trial design (e.g., parallel, factorial) including allocation ratio and any changes to the design after trial commencement.</p>

<p><strong>Participants</strong></p>
<p>Describe the eligibility criteria for participants, the settings and locations where the data were collected.</p>

<p><strong>Interventions</strong></p>
<p>Describe the interventions for each group with sufficient detail to allow replication, including how and when they were administered.</p>

<p><strong>Outcomes</strong></p>
<p>Define the primary and secondary outcome measures, including how and when they were assessed.</p>

<p><strong>Sample Size</strong></p>
<p>Explain how the sample size was determined, including any interim analyses and stopping guidelines.</p>

<p><strong>Randomization</strong></p>
<p>Describe the method used to generate the random allocation sequence, the type of randomization, and the mechanism used to implement the random allocation sequence.</p>

<p><strong>Blinding</strong></p>
<p>Describe who was blinded after assignment to interventions (e.g., participants, care providers, those assessing outcomes).</p>

<p><strong>Statistical Methods</strong></p>
<p>Describe the statistical methods used to compare groups for primary and secondary outcomes, methods for additional analyses (e.g., subgroup analyses).</p>

<h2>Results</h2>
<p><strong>Participant Flow</strong></p>
<p>Describe the flow of participants through each stage of the trial, including the number of participants who were randomly assigned, received intended treatment, and were analyzed for the primary outcome.</p>

<p><strong>Baseline Data</strong></p>
<p>Present a table showing baseline demographic and clinical characteristics for each group.</p>

<p><strong>Numbers Analyzed</strong></p>
<p>For each group, report the number of participants included in each analysis and whether the analysis was by original assigned groups.</p>

<p><strong>Outcomes and Estimation</strong></p>
<p>For each primary and secondary outcome, report the results for each group, the estimated effect size, and its precision (e.g., 95% confidence interval).</p>

<p><strong>Ancillary Analyses</strong></p>
<p>Report any other analyses performed, including subgroup analyses and adjusted analyses, indicating which were pre-specified and which were exploratory.</p>

<p><strong>Harms</strong></p>
<p>Report all important harms or unintended effects in each group.</p>

<h2>Discussion</h2>
<p><strong>Limitations</strong></p>
<p>Discuss the limitations of the trial, addressing sources of potential bias, imprecision, and, if relevant, multiplicity of analyses.</p>

<p><strong>Generalizability</strong></p>
<p>Discuss the generalizability (external validity) of the trial findings.</p>

<p><strong>Interpretation</strong></p>
<p>Provide an interpretation consistent with the results, balancing benefits and harms, and considering other relevant evidence.</p>

<h2>Conclusion</h2>
<p>Summarize the main findings and implications for practice and future research.</p>

<h2>Acknowledgments</h2>
<p>Acknowledge any funding sources, contributions from non-authors, and any conflicts of interest.</p>

<h2>References</h2>
<p>1. Author A, Author B, Author C, et al. Title of the article. Journal Name. Year;Volume(Issue):Pages.</p>
<p>2. Author D, Author E. Title of the book chapter. In: Editor F, Editor G, eds. Title of the Book. Publisher; Year:Pages.</p>`
    },
    {
      id: 'data-science',
      title: 'Data Science Research',
      description: 'Format for data science and analytics',
      icon: <ChartBar className="h-10 w-10 text-blue-500" />,
      content: `<h1>Title of Data Science Research Paper</h1>
<p>Author Name<sup>1</sup>, Co-Author Name<sup>2</sup><br>
<i>1 Department, Institution, City, Country</i><br>
<i>2 Department, Institution, City, Country</i><br>
Email: corresponding.author@example.com</p>

<h2>Abstract</h2>
<p>This template is designed for data science research papers. The abstract should provide a concise summary of the research problem, the methodology, the key results, and the implications of the findings. The abstract should be around 150-250 words.</p>

<h2>Keywords</h2>
<p>data science; machine learning; analytics; big data; visualization</p>

<h2>Introduction</h2>
<p>The introduction should provide the context and background for the research problem. It should explain why the problem is important and interesting from a data science perspective. The introduction should also review relevant literature, identify the gaps in existing knowledge, and clearly state the objectives or research questions of the study.</p>

<h2>Related Work</h2>
<p>This section should provide a more detailed review of related work in the field. It should summarize previous studies that are directly relevant to the current research, highlighting their methodologies, findings, and limitations. This section helps to situate the current study within the existing body of knowledge and to justify the chosen approach.</p>

<h2>Data Description</h2>
<p>This section should describe the data used in the study, including its source, size, and characteristics. It should explain how the data was collected, any preprocessing or cleaning that was performed, and the final structure of the dataset. If applicable, it should also discuss any ethical considerations or limitations related to the data.</p>

<h2>Methodology</h2>
<p>The methodology section should describe the approach used to address the research problem. It should include:</p>
<p>- The overall framework or model</p>
<p>- The specific algorithms or techniques used</p>
<p>- The feature engineering process</p>
<p>- The evaluation metrics</p>
<p>- The experimental setup, including any cross-validation strategy</p>
<p>- The implementation details, including software and hardware specifications</p>

<h2>Results</h2>
<p>The results section should present the findings of the study in a clear and organized manner. It should include tables, figures, and visualizations that help to communicate the results effectively. For each experiment or analysis, it should report the relevant metrics and compare the performance of different approaches if applicable.</p>

<h2>Discussion</h2>
<p>The discussion section should interpret the results in the context of the research objectives or questions. It should explain what the results mean and why they matter. It should also address any unexpected findings and discuss the limitations of the study. Finally, it should relate the findings back to the existing literature and highlight how they contribute to the field.</p>

<h2>Conclusion and Future Work</h2>
<p>The conclusion should summarize the key findings and their implications for theory and practice. It should also suggest directions for future research, including potential improvements to the methodology and new research questions that arise from the current study.</p>

<h2>Acknowledgments</h2>
<p>This section acknowledges any funding sources, technical assistance, or other contributions that do not merit authorship.</p>

<h2>References</h2>
<p>1. Author A, Author B. Title of the article. Journal Name. Year;Volume(Issue):Pages.</p>
<p>2. Author C, Author D. Title of the conference paper. In: Proceedings of Conference Name; Year; Location. Publisher; Pages.</p>
<p>3. Author E. Title of the Book. Publisher; Year.</p>`
    },
    {
      id: 'systematic-review',
      title: 'Systematic Review',
      description: 'PRISMA format for systematic reviews',
      icon: <FileSpreadsheet className="h-10 w-10 text-yellow-600" />,
      content: `<h1>Title of Systematic Review</h1>
<p>Author Name<sup>1</sup>, Co-Author Name<sup>2</sup>, Additional Author<sup>3</sup><br>
<i>1 Department, Institution, City, Country</i><br>
<i>2 Department, Institution, City, Country</i><br>
<i>3 Department, Institution, City, Country</i><br>
Email: corresponding.author@example.com</p>

<h2>Abstract</h2>
<p><strong>Background:</strong> Provide context for the review and its objectives.</p>
<p><strong>Methods:</strong> Describe the protocol, eligibility criteria, information sources, search strategy, study selection process, data extraction, and methods for assessing risk of bias.</p>
<p><strong>Results:</strong> Summarize the main findings, including the number of studies and participants, characteristics of included studies, risk of bias, and results of syntheses.</p>
<p><strong>Conclusions:</strong> State the main conclusions and implications for practice and research.</p>
<p><strong>Registration:</strong> Provide the registration number and registry name (if applicable).</p>
<p><strong>Funding:</strong> Identify the funding source(s).</p>

<h2>Introduction</h2>
<p><strong>Rationale</strong></p>
<p>Describe the rationale for the review in the context of what is already known.</p>

<p><strong>Objectives</strong></p>
<p>Provide an explicit statement of the research question(s) that the review aims to address.</p>

<h2>Methods</h2>
<p><strong>Protocol and Registration</strong></p>
<p>Indicate if a review protocol exists, where it can be accessed, and the registration information.</p>

<p><strong>Eligibility Criteria</strong></p>
<p>Specify the inclusion and exclusion criteria for the review, including study characteristics (e.g., PICOS, length of follow-up) and report characteristics (e.g., years considered, language, publication status).</p>

<p><strong>Information Sources</strong></p>
<p>Describe all information sources (e.g., databases, contact with study authors, trial registers) and the date of the last search.</p>

<p><strong>Search Strategy</strong></p>
<p>Present the full electronic search strategy for at least one database, including any limits used.</p>

<p><strong>Study Selection</strong></p>
<p>Describe the process for selecting studies (i.e., screening, eligibility, inclusion in the review).</p>

<p><strong>Data Collection Process</strong></p>
<p>Describe the method of data extraction from reports and any processes for obtaining and confirming data from investigators.</p>

<p><strong>Data Items</strong></p>
<p>List and define all variables for which data were sought and any assumptions and simplifications made.</p>

<p><strong>Risk of Bias in Individual Studies</strong></p>
<p>Describe the methods used for assessing risk of bias in individual studies and how this information will be used in data synthesis.</p>

<p><strong>Summary Measures</strong></p>
<p>State the principal summary measures (e.g., risk ratio, difference in means).</p>

<p><strong>Synthesis of Results</strong></p>
<p>Describe the methods for handling data and combining results of studies, including measures of consistency for each meta-analysis.</p>

<h2>Results</h2>
<p><strong>Study Selection</strong></p>
<p>Provide the number of studies screened, assessed for eligibility, and included in the review, with reasons for exclusions at each stage, ideally with a flow diagram.</p>

<p><strong>Study Characteristics</strong></p>
<p>For each study, present characteristics for which data were extracted and provide the citations.</p>

<p><strong>Risk of Bias Within Studies</strong></p>
<p>Present data on risk of bias of each study and, if available, any outcome-level assessment.</p>

<p><strong>Results of Individual Studies</strong></p>
<p>For all outcomes considered, present, for each study, simple summary data for each intervention group and effect estimates and confidence intervals, ideally with a forest plot.</p>

<p><strong>Synthesis of Results</strong></p>
<p>Present the results of each meta-analysis done, including confidence intervals and measures of consistency.</p>

<p><strong>Risk of Bias Across Studies</strong></p>
<p>Present results of any assessment of risk of bias across studies.</p>

<p><strong>Additional Analysis</strong></p>
<p>Provide results of additional analyses, if done (e.g., sensitivity or subgroup analyses, meta-regression).</p>

<h2>Discussion</h2>
<p><strong>Summary of Evidence</strong></p>
<p>Summarize the main findings, including the strength of evidence for each main outcome, and consider their relevance to key groups.</p>

<p><strong>Limitations</strong></p>
<p>Discuss limitations at study and outcome level (e.g., risk of bias) and at review level (e.g., incomplete retrieval of identified research, reporting bias).</p>

<p><strong>Conclusions</strong></p>
<p>Provide a general interpretation of the results in the context of other evidence and implications for future research.</p>

<h2>Acknowledgments</h2>
<p>Acknowledge any funding sources, contributions from non-authors, and any conflicts of interest.</p>

<h2>References</h2>
<p>1. Author A, Author B, Author C, et al. Title of the article. Journal Name. Year;Volume(Issue):Pages.</p>
<p>2. Author D, Author E. Title of the book chapter. In: Editor F, Editor G, eds. Title of the Book. Publisher; Year:Pages.</p>`
    }
  ];
  
  return (
    <div>
      <h2 className="text-2xl font-bold mb-5">Research Paper Templates</h2>
      <p className="text-gray-600 mb-6">Select a template to quickly start your research paper with professional formatting</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${selectedTemplate === template.id ? 'ring-2 ring-primary' : ''}`}
            onClick={() => handleSelectTemplate(template.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-center mb-2">
                {template.icon}
              </div>
              <CardTitle className="text-center">{template.title}</CardTitle>
              <CardDescription className="text-center">{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <button 
                className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectTemplate(template.id);
                }}
                disabled={createFromTemplateMutation.isPending}
              >
                {createFromTemplateMutation.isPending && selectedTemplate === template.id ? 
                  'Creating...' : 'Use Template'}
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}