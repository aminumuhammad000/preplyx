-- Reproducible, additive demo seed for the separate Swallern Exam database.
-- The questions below are synthetic examples. They are NOT official past questions.
begin;

insert into public.exams (id, code, name, description, display_order, visual_metadata, active)
values
  (md5('exam:NECO')::uuid, 'NECO', 'National Examinations Council', 'Demo exam catalog for the Swallern exam game.', 1, '{"accent":"#36d6a4"}', true),
  (md5('exam:WAEC')::uuid, 'WAEC', 'West African Examinations Council', 'Demo exam catalog for the Swallern exam game.', 2, '{"accent":"#a887ff"}', true),
  (md5('exam:JAMB')::uuid, 'JAMB', 'Joint Admissions and Matriculation Board', 'Demo exam catalog for the Swallern exam game.', 3, '{"accent":"#36adff"}', true)
on conflict (code) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order,
  visual_metadata = excluded.visual_metadata, active = excluded.active;

insert into public.subjects (id, code, name, description, visual_metadata, active)
values
  (md5('subject:MATH')::uuid, 'MATH', 'Mathematics', 'Number, algebra, geometry, and quantitative reasoning.', '{"icon":"mathematics","accent":"#36adff"}', true),
  (md5('subject:ENG')::uuid, 'ENG', 'English Language', 'Grammar, vocabulary, comprehension, and communication.', '{"icon":"english","accent":"#a887ff"}', true),
  (md5('subject:BIO')::uuid, 'BIO', 'Biology', 'Living things, cells, ecology, and human biology.', '{"icon":"biology","accent":"#36d6a4"}', true),
  (md5('subject:CHEM')::uuid, 'CHEM', 'Chemistry', 'Matter, atoms, reactions, and chemical properties.', '{"icon":"chemistry","accent":"#ffad64"}', true),
  (md5('subject:PHY')::uuid, 'PHY', 'Physics', 'Motion, forces, energy, light, and electricity.', '{"icon":"physics","accent":"#48c5e8"}', true),
  (md5('subject:ECON')::uuid, 'ECON', 'Economics', 'Choices, markets, production, and economic systems.', '{"icon":"economics","accent":"#f2c95d"}', true),
  (md5('subject:GOVT')::uuid, 'GOVT', 'Government', 'Constitutions, institutions, citizenship, and public authority.', '{"icon":"government","accent":"#64c7a2"}', true),
  (md5('subject:LIT')::uuid, 'LIT', 'Literature in English', 'Literary forms, language, narrative, and dramatic technique.', '{"icon":"literature","accent":"#d28be8"}', true)
on conflict (code) do update set name = excluded.name, description = excluded.description,
  visual_metadata = excluded.visual_metadata, active = excluded.active;

-- Explicit exam-subject offerings: Literature in English is not included in
-- this JAMB demo offering, while all eight subjects are represented for NECO/WAEC.
insert into public.exam_subjects (id, exam_id, subject_id, active)
select md5('exam-subject:' || e.code || ':' || s.code)::uuid, e.id, s.id, true
from public.exams e
join public.subjects s on
  (e.code in ('NECO', 'WAEC') and s.code in ('MATH','ENG','BIO','CHEM','PHY','ECON','GOVT','LIT'))
  or (e.code = 'JAMB' and s.code in ('MATH','ENG','BIO','CHEM','PHY','ECON','GOVT'))
where e.code in ('NECO', 'WAEC', 'JAMB')
on conflict (exam_id, subject_id) do update set active = excluded.active;

insert into public.exam_years (id, exam_id, year, active)
select md5('exam-year:' || e.code || ':' || y)::uuid, e.id, y::smallint, true
from public.exams e cross join generate_series(2000, 2025) as y
where e.code in ('NECO', 'WAEC', 'JAMB')
on conflict (exam_id, year) do update set active = excluded.active;

create temporary table demo_question_bank (
  subject_code text not null,
  question_number integer not null,
  question_text text not null,
  correct_option text not null,
  explanation text not null,
  options jsonb not null,
  primary key (subject_code, question_number)
) on commit drop;

insert into demo_question_bank values
-- Original synthetic mathematics questions.
('MATH',1,'DEMO: What is 3/4 of 80?','A','Multiply 80 by 3/4 to get 60.','["60","20","40","64"]'),
('MATH',2,'DEMO: Solve 2x + 5 = 17.','B','Subtract 5, then divide 12 by 2; x = 6.','["5","6","7","11"]'),
('MATH',3,'DEMO: What is the area of a rectangle 9 cm long and 4 cm wide?','C','Area is length multiplied by width: 9 × 4 = 36 cm².','["13 cm²","26 cm²","36 cm²","72 cm²"]'),
('MATH',4,'DEMO: Express 0.35 as a percentage.','A','Multiply a decimal by 100 to convert it to a percentage.','["35%","3.5%","0.35%","350%"]'),
('MATH',5,'DEMO: What is the next prime number after 11?','D','13 has no positive divisors other than 1 and itself.','["12","14","15","13"]'),
('MATH',6,'DEMO: A bag has 3 red and 2 blue counters. What is the probability of choosing a blue counter?','B','There are two blue counters among five counters in total.','["1/5","2/5","3/5","1/2"]'),
('MATH',7,'DEMO: Simplify 5a + 2a − 3a.','C','Combine like terms: (5 + 2 − 3)a = 4a.','["10a","a","4a","6a"]'),
('MATH',8,'DEMO: What is the mean of 4, 6, 8, and 10?','A','The sum is 28; dividing by four values gives 7.','["7","6","8","28"]'),
('MATH',9,'DEMO: Two angles in a triangle are 50° and 60°. Find the third angle.','D','The interior angles of a triangle sum to 180°.','["60°","80°","90°","70°"]'),
('MATH',10,'DEMO: Write 2.4 × 10³ as an ordinary number.','B','10³ is 1000, so 2.4 × 1000 = 2400.','["240","2400","24,000","2,403"]'),
-- Original synthetic English Language questions.
('ENG',1,'DEMO: Choose the correctly punctuated sentence.','A','A direct question ends with a question mark.','["Where are you going?","Where are you going.","Where are you going,","Where are you going!"]'),
('ENG',2,'DEMO: Select the word closest in meaning to “brief”.','C','Brief means short in duration or length.','["distant","careful","short","bright"]'),
('ENG',3,'DEMO: Which word is the adverb in “The team moved quickly”?','B','Quickly describes how the team moved, so it is an adverb.','["team","quickly","moved","the"]'),
('ENG',4,'DEMO: Complete the sentence: “Neither the coach nor the players ___ late.”','D','With neither/nor, the verb agrees with the nearer subject, players.','["is","was","has been","were"]'),
('ENG',5,'DEMO: Choose the antonym of “expand”.','A','Contract means to become smaller or reduce in size.','["contract","extend","increase","enlarge"]'),
('ENG',6,'DEMO: Which sentence uses “their” correctly?','C','Their is the possessive form referring to something belonging to them.','["There going home now.","They left there books.","Their books are on the desk.","The books are over their."]'),
('ENG',7,'DEMO: Identify the conjunction: “We waited because the bus was delayed.”','B','Because connects the main clause to a reason clause.','["waited","because","bus","delayed"]'),
('ENG',8,'DEMO: Choose the correct plural of “analysis”.','D','The standard plural form of analysis is analyses.','["analysises","analysises","analysi","analyses"]'),
('ENG',9,'DEMO: In a formal letter, which closing is most appropriate?','A','Yours faithfully is a conventional formal closing when the recipient is unnamed.','["Yours faithfully","See you soon","Cheers mate","Lots of love"]'),
('ENG',10,'DEMO: Which word is a synonym for “accurate”?','C','Accurate means correct or free from error.','["uncertain","approximate","correct","unclear"]'),
-- Original synthetic biology questions.
('BIO',1,'DEMO: Which cell structure contains most genetic material in a human cell?','B','The nucleus stores most of a human cell’s DNA.','["ribosome","nucleus","cell wall","vacuole"]'),
('BIO',2,'DEMO: Which process do green plants use to make glucose using light?','D','Photosynthesis converts light energy, carbon dioxide, and water into sugars.','["respiration","transpiration","digestion","photosynthesis"]'),
('BIO',3,'DEMO: What is the basic structural unit of living organisms?','A','Cells are the basic structural and functional units of life.','["cell","organ","tissue","system"]'),
('BIO',4,'DEMO: Which blood cells help defend the body against pathogens?','C','White blood cells are part of the immune system.','["platelets","red cells","white cells","plasma"]'),
('BIO',5,'DEMO: Which gas is released by green plants during photosynthesis?','B','Oxygen is released when water molecules are split during photosynthesis.','["nitrogen","oxygen","carbon monoxide","hydrogen"]'),
('BIO',6,'DEMO: What is the main role of a decomposer in an ecosystem?','D','Decomposers break down dead material and return nutrients to the environment.','["make sunlight","hunt herbivores","pollinate flowers","recycle nutrients"]'),
('BIO',7,'DEMO: Which part of a flowering plant absorbs most water from the soil?','A','Root hairs provide a large surface area for water absorption.','["root hairs","petals","anthers","stigma"]'),
('BIO',8,'DEMO: Which molecule carries hereditary information?','C','DNA carries genetic information in most living organisms.','["starch","haemoglobin","DNA","cellulose"]'),
('BIO',9,'DEMO: Which organ pumps blood around the human body?','B','The heart contracts to circulate blood through the body.','["liver","heart","kidney","lung"]'),
('BIO',10,'DEMO: Animals that eat both plants and animals are called what?','D','Omnivores obtain food from both plant and animal sources.','["herbivores","producers","parasites","omnivores"]'),
-- Original synthetic chemistry questions.
('CHEM',1,'DEMO: What is the chemical symbol for sodium?','A','Sodium’s chemical symbol is Na, from the Latin natrium.','["Na","S","So","N"]'),
('CHEM',2,'DEMO: A solution with pH 3 is best described as what?','C','A pH below 7 indicates an acidic solution.','["neutral","alkaline","acidic","saturated"]'),
('CHEM',3,'DEMO: What is the atomic number of an element equal to?','B','Atomic number is the number of protons in the nucleus.','["number of neutrons","number of protons","protons plus neutrons","number of shells"]'),
('CHEM',4,'DEMO: Which gas is produced when an acid reacts with a reactive metal?','D','Acid-metal reactions commonly produce a salt and hydrogen gas.','["oxygen","nitrogen","carbon dioxide","hydrogen"]'),
('CHEM',5,'DEMO: Which method can separate an insoluble solid from a liquid?','A','Filtration traps an insoluble solid while the liquid passes through.','["filtration","distillation","chromatography","fractional distillation"]'),
('CHEM',6,'DEMO: What type of bond forms when atoms share electron pairs?','C','A covalent bond involves sharing electron pairs between atoms.','["ionic","metallic","covalent","hydrogen"]'),
('CHEM',7,'DEMO: Which formula represents water?','B','A water molecule contains two hydrogen atoms and one oxygen atom.','["CO₂","H₂O","O₂","NaCl"]'),
('CHEM',8,'DEMO: What is the change from a liquid to a gas at the surface called?','D','Evaporation occurs at a liquid surface below or at its boiling point.','["freezing","condensation","melting","evaporation"]'),
('CHEM',9,'DEMO: Which particle has a negative electrical charge?','A','Electrons carry a negative charge.','["electron","proton","neutron","nucleus"]'),
('CHEM',10,'DEMO: What is the approximate relative molecular mass of CO₂?','C','Carbon contributes 12 and two oxygen atoms contribute 32; total 44.','["28","32","44","48"]'),
-- Original synthetic physics questions.
('PHY',1,'DEMO: What is the SI unit of force?','D','The newton is the SI unit of force.','["joule","watt","pascal","newton"]'),
('PHY',2,'DEMO: A car travels 100 m in 20 s. What is its average speed?','B','Average speed is distance divided by time: 100/20 = 5 m/s.','["2 m/s","5 m/s","20 m/s","80 m/s"]'),
('PHY',3,'DEMO: Which instrument measures electric current?','A','An ammeter measures electric current in a circuit.','["ammeter","voltmeter","thermometer","barometer"]'),
('PHY',4,'DEMO: What happens to the image distance in a plane mirror compared with the object distance?','C','A plane mirror forms an image the same distance behind it as the object is in front.','["it is doubled","it is halved","it is equal","it is zero"]'),
('PHY',5,'DEMO: Which form of energy is stored in a raised object?','D','A raised object has gravitational potential energy.','["sound","chemical","electrical","gravitational potential"]'),
('PHY',6,'DEMO: What is the SI unit of electrical resistance?','B','Electrical resistance is measured in ohms.','["ampere","ohm","volt","coulomb"]'),
('PHY',7,'DEMO: Which simple machine is a fixed pulley most useful for?','A','A fixed pulley changes the direction of an applied force.','["changing force direction","creating energy","reducing mass","storing heat"]'),
('PHY',8,'DEMO: Sound travels fastest through which of these states of matter?','C','Particles are closely spaced in solids, allowing sound vibrations to pass quickly.','["vacuum","gas","solid","all at the same speed"]'),
('PHY',9,'DEMO: What is the acceleration of an object moving at constant velocity in a straight line?','D','Constant velocity means velocity is not changing, so acceleration is zero.','["1 m/s²","9.8 m/s²","depends on mass","0 m/s²"]'),
('PHY',10,'DEMO: Which device converts electrical energy to light in a basic circuit?','B','A lamp converts electrical energy mainly into light and heat.','["switch","lamp","fuse","cell"]'),
-- Original synthetic economics questions.
('ECON',1,'DEMO: What is opportunity cost?','C','Opportunity cost is the next best alternative forgone when making a choice.','["total money earned","market price","next best alternative forgone","cost of all alternatives"]'),
('ECON',2,'DEMO: If demand rises while supply stays constant, what usually happens to equilibrium price?','A','With unchanged supply, increased demand usually raises the equilibrium price.','["it rises","it falls","it is always unchanged","it becomes zero"]'),
('ECON',3,'DEMO: Which factor of production receives rent?','D','Land as a factor of production earns rent.','["labour","capital","enterprise","land"]'),
('ECON',4,'DEMO: What does inflation describe?','B','Inflation is a sustained rise in the general price level.','["fall in output only","sustained rise in general prices","increase in one price","fall in money supply"]'),
('ECON',5,'DEMO: Which is an example of capital as a factor of production?','A','A machine used to produce goods is a capital good.','["a sewing machine in a factory","a consumer buying a shirt","a river in nature","a worker’s skill"]'),
('ECON',6,'DEMO: A market with many sellers offering similar products is closest to which structure?','C','Many sellers and similar products are features associated with perfect competition.','["monopoly","monopsony","perfect competition","bilateral monopoly"]'),
('ECON',7,'DEMO: What is a budget deficit?','D','A deficit occurs when expenditure exceeds revenue over a period.','["exports exceed imports","saving exceeds spending","tax equals spending","expenditure exceeds revenue"]'),
('ECON',8,'DEMO: Which measure compares the value of a currency with another currency?','B','An exchange rate states the value of one currency in terms of another.','["price index","exchange rate","interest rate","wage rate"]'),
('ECON',9,'DEMO: What is the main purpose of a central bank’s monetary policy?','A','Monetary policy manages money and credit conditions to support economic objectives.','["influence money and credit conditions","set every shop price","choose all company wages","write household budgets"]'),
('ECON',10,'DEMO: When price rises and quantity demanded falls, this illustrates what?','C','The law of demand describes an inverse relationship, other things equal.','["law of supply","diminishing returns","law of demand","comparative advantage"]'),
-- Original synthetic government questions.
('GOVT',1,'DEMO: Which arm of government primarily interprets laws?','B','The judiciary interprets laws and resolves legal disputes.','["executive","judiciary","legislature","civil service"]'),
('GOVT',2,'DEMO: What is a constitution?','D','A constitution sets fundamental rules and principles for governing a state.','["a campaign poster","a court case","a tax receipt","the fundamental rules of a state"]'),
('GOVT',3,'DEMO: The right of eligible citizens to vote is called what?','A','Suffrage is the right to vote in political elections.','["suffrage","censorship","impeachment","diplomacy"]'),
('GOVT',4,'DEMO: In a federation, governmental powers are constitutionally divided between which levels?','C','Federal systems divide authority between central and regional or state governments.','["political parties only","courts and police only","central and regional governments","voters and candidates"]'),
('GOVT',5,'DEMO: Which institution is responsible for making laws in a democracy?','B','The legislature debates and enacts laws.','["cabinet","legislature","judiciary","electoral commission"]'),
('GOVT',6,'DEMO: What is a secret ballot designed to protect?','D','A secret ballot protects the privacy of a voter’s choice.','["the counting speed","the candidate list","the campaign schedule","the privacy of a vote"]'),
('GOVT',7,'DEMO: Which principle limits each branch by giving powers to other branches?','A','Checks and balances help prevent excessive concentration of power.','["checks and balances","collective farming","judicial notice","popular sovereignty only"]'),
('GOVT',8,'DEMO: A person who legally belongs to a state is known as what?','C','Citizenship is legal membership of a state.','["resident alien","delegate","citizen","ambassador"]'),
('GOVT',9,'DEMO: What is the peaceful transfer of authority after an election an example of?','B','A peaceful transfer of power is a feature of constitutional democratic government.','["military rule","constitutional succession","censorship","annexation"]'),
('GOVT',10,'DEMO: Which body typically supervises the conduct of public elections?','D','An independent electoral commission administers and supervises elections.','["the cabinet","the supreme court in every case","the police alone","an electoral commission"]'),
-- Original synthetic Literature in English questions.
('LIT',1,'DEMO: A comparison using “like” or “as” is called what?','C','A simile makes a comparison using words such as like or as.','["metaphor","irony","simile","hyperbole"]'),
('LIT',2,'DEMO: Who tells the story in a first-person narrative?','A','A first-person narrator tells events using a participant’s point of view.','["a narrator using “I”","the stage manager only","the publisher","the audience"]'),
('LIT',3,'DEMO: A play written to be serious and often ending in catastrophe is usually a what?','D','Tragedy is a dramatic form involving serious conflict and often a disastrous ending.','["ballad","comedy","fable","tragedy"]'),
('LIT',4,'DEMO: What is the central struggle in a literary work called?','B','Conflict is the central opposition that drives a narrative or drama.','["setting","conflict","rhyme","aside"]'),
('LIT',5,'DEMO: Repetition of initial consonant sounds in nearby words is called what?','A','Alliteration repeats initial consonant sounds for emphasis or musical effect.','["alliteration","assonance","onomatopoeia","euphemism"]'),
('LIT',6,'DEMO: A long narrative poem about heroic deeds is commonly called what?','C','An epic is an extended narrative poem about heroic deeds or a people’s history.','["lyric","sonnet","epic","elegy"]'),
('LIT',7,'DEMO: What is the time and place of a story called?','D','Setting identifies where and when a literary work takes place.','["plot","theme","tone","setting"]'),
('LIT',8,'DEMO: A remark whose intended meaning differs from its literal wording may use what device?','B','Irony involves a contrast between appearance or wording and the intended meaning or outcome.','["imagery","irony","rhyme","dialogue"]'),
('LIT',9,'DEMO: A group of lines in a poem is called what?','A','A stanza is a grouped set of lines in a poem.','["stanza","chapter","scene","paragraph only"]'),
('LIT',10,'DEMO: The main idea explored in a literary work is its what?','C','Theme is the central idea or concern developed in a literary work.','["meter","setting","theme","foot"]');

-- Three recent demo years per subject make 10-question playable sets; all
-- 2000–2025 year records still appear in the live selector and unavailable
-- combinations remain correctly unavailable.
insert into public.question_sets (id, exam_id, subject_id, year_id, title, description, question_count, source_type, status, active, metadata)
select md5('question-set:' || e.code || ':' || s.code || ':' || y.year)::uuid,
  e.id, s.id, y.id,
  'DEMO ONLY · ' || s.name || ' · ' || y.year,
  'Synthetic practice content for game integration testing. Not an authentic ' || e.code || ' past-paper set.',
  0, 'demo', 'published', true,
  jsonb_build_object('demo', true, 'official_past_question', false, 'demo_seed', 'swallern-exam-v1')
from public.exam_subjects es
join public.exams e on e.id = es.exam_id
join public.subjects s on s.id = es.subject_id
join public.exam_years y on y.exam_id = e.id and y.year between 2023 and 2025
where e.active and s.active and es.active and y.active
on conflict (exam_id, subject_id, year_id) do update set
  title = excluded.title, description = excluded.description, source_type = excluded.source_type,
  status = excluded.status, active = excluded.active, metadata = excluded.metadata;

insert into public.questions (id, question_set_id, question_number, question_text, question_type, explanation, correct_option, source_type, status, active, metadata)
select md5('question:' || qs.id::text || ':' || b.question_number)::uuid,
  qs.id, b.question_number, b.question_text, 'multiple_choice', b.explanation,
  b.correct_option, 'demo', 'published', true,
  jsonb_build_object('demo', true, 'official_past_question', false, 'demo_seed', 'swallern-exam-v1')
from public.question_sets qs
join public.subjects s on s.id = qs.subject_id
join demo_question_bank b on b.subject_code = s.code
where qs.source_type = 'demo' and qs.metadata->>'demo_seed' = 'swallern-exam-v1' and qs.active
on conflict (id) do update set question_set_id = excluded.question_set_id,
  question_number = excluded.question_number, question_text = excluded.question_text,
  question_type = excluded.question_type, explanation = excluded.explanation,
  correct_option = excluded.correct_option, source_type = excluded.source_type,
  status = excluded.status, active = excluded.active, metadata = excluded.metadata;

insert into public.question_options (id, question_id, option_key, option_text, sort_order)
select md5('option:' || q.id::text || ':' || key_row.key)::uuid,
  q.id, key_row.key, option_row.value, option_row.ordinality::smallint
from public.questions q
join public.question_sets qs on qs.id = q.question_set_id and qs.source_type = 'demo' and qs.metadata->>'demo_seed' = 'swallern-exam-v1'
join public.subjects s on s.id = qs.subject_id
join demo_question_bank b on b.subject_code = s.code and b.question_number = q.question_number
cross join lateral jsonb_array_elements_text(b.options) with ordinality as option_row(value, ordinality)
cross join lateral (select chr((64 + option_row.ordinality)::integer)::text as key) as key_row
on conflict (question_id, option_key) do update set
  option_text = excluded.option_text, sort_order = excluded.sort_order;

select e.code as exam,
  (select count(*) from public.exam_subjects es where es.exam_id = e.id and es.active) as subjects,
  (select count(*) from public.exam_years y where y.exam_id = e.id and y.active) as years,
  (select count(*) from public.question_sets qs where qs.exam_id = e.id and qs.active and qs.status = 'published' and qs.source_type = 'demo') as demo_question_sets,
  (select coalesce(sum(qs.question_count), 0) from public.question_sets qs where qs.exam_id = e.id and qs.active and qs.status = 'published' and qs.source_type = 'demo') as playable_questions
from public.exams e where e.code in ('NECO','WAEC','JAMB') order by e.code;

commit;
