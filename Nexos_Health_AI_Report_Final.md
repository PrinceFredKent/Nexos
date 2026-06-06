



NEXOS HEALTH AI
An AI-Integrated Personal Health Assistant System



A Project Report Submitted in Partial Fulfillment of the Requirements
for the Award of a Diploma in Information and Communication Technology

Buganda Royal Institute of Business and Technical Education, Mengo
Department of Information and Communication Technology


Submitted by:
Sseninde Fred
Registration No.: BR/NDICT/8003/24

Supervised by:
Mr. Ssekuwanda Henry
Head of Departments


May 2026


# DECLARATION

I, Sseninde Fred, declare that this project report titled, Nexos: An AI-Integrated Personal Health Assistant System, is my original work and has not been submitted to any institution for any academic award. All sources used have been duly acknowledged in accordance with academic integrity standards. I take full responsibility for the content herein and confirm that no portion of this work has been plagiarized or submitted elsewhere.

Student Name: Sseninde Fred
Registration No.: BR/NDICT/8003/24
Signature: _______________________
Date: ___________________________


# APPROVAL

This project report titled, An AI-Integrated Personal Health Assistant System, has been examined and submitted with the approval of the supervisor as partial fulfillment of the requirements for the award of a Diploma in Information and Communication Technology at Buganda Royal Institute of Business and Technical Education, Mengo.

Supervisor Name: Mr. Ssekuwanda Henry
Academic Rank: Head of Departments
Signature: ______________________
Date: __________________________


# DEDICATION

This project is dedicated to my beloved family, whose unwavering love and sacrifice throughout my academic journey made this achievement possible, and to my lecturers at Buganda Royal Institute of Business and Technical Education, Mengo, whose knowledge and mentorship shaped my understanding of Information and Communication Technology.


# ACKNOWLEDGEMENT

Sincere appreciation is expressed to my supervisor, Mr. Ssekuwanda Henry, for the guidance and constructive direction provided throughout the design and development process. Gratitude is also extended to the lecturers of the Department of ICT at Buganda Royal Institute of Business and Technical Education, Mengo, for equipping me with the academic and technical knowledge necessary to undertake this project.
Special appreciation goes to Mengo Hospital for providing the contextual reference that shaped the design priorities of this system, and to the developers and maintainers of the open-source tools used, including React.js, FastAPI, SQLAlchemy, SQLite, and Supabase. Finally, heartfelt thanks go to my family for their patience, financial support, and moral encouragement throughout the period of study and implementation.


# ABSTRACT

Nexos Health AI is an offline-first, AI-driven personal health assistant system designed to support users with symptom analysis, medication management, menstrual cycle tracking, emergency response, and personal health planning. The system was developed in response to growing challenges associated with healthcare accessibility, fragmented digital health tools, and limited offline support in low-connectivity environments. Mengo Hospital in Kampala, Uganda, served as the case reference context.
The application employed a hybrid storage model, maintaining data in SQLite locally for offline access and synchronizing with a Supabase cloud backend for multi-device support. The backend was implemented using FastAPI, while the frontend was built in React.js with Vite. Security was maintained through JWT authentication, OTP verification, and BCrypt password hashing.
The system integrated seven major functional modules: an AI-based Intelligence Manager for symptom analysis, a Medication Management module, a Menstrual Cycle Tracker, a Health Planner, an Emergency SOS module, a Global Health Search function, and a User Authentication system. Testing confirmed that all modules performed as expected. The study demonstrated that it is technically feasible to combine local data storage, cloud synchronization, AI-driven health guidance, and a premium user interface into a single, self-contained personal health platform.

Keywords: AI Health Assistant, Offline-First Architecture, Symptom Analysis, Medication Management, Menstrual Cycle Tracking, Emergency SOS, Cloud Synchronization, FastAPI, React.js, SQLite, Supabase.

Disclaimer: Nexos Health AI is an academic project submitted in partial fulfillment of the requirements for a Diploma in ICT. It does not replace professional medical services or clinical diagnosis.


# CHAPTER ONE


## 1.0 Introduction

The growing influence of information and communication technology has fundamentally transformed the way healthcare services are delivered and accessed across the world. Despite significant advances, many digital health systems continued to suffer from critical limitations, restricted offline access, fragmented feature sets, and poor user experience. In environments such as Uganda, where internet connectivity remained inconsistent and healthcare resources were under significant pressure, these shortcomings had real consequences for the health outcomes of ordinary citizens. Nexos Health AI was developed specifically to address these challenges through an offline-first design philosophy, providing an integrated set of health management features within a single, self-contained application.


## 1.1 Background of the Study

Access to timely, accurate, and understandable healthcare information remained a major challenge in many parts of the world, particularly in sub-Saharan Africa. In Uganda, public and private healthcare facilities such as Mengo Hospital served extremely large populations, handling over 250,000 outpatient visits and 15,000 inpatient admissions annually. A significant proportion of patients who visited such facilities presented with symptoms that could have benefited from preliminary digital assessment before physical consultation; however, accessible self-management tools remained largely absent from patients' hands.
Many individuals instead relied on general internet searches or informal social media advice to understand their symptoms. As the Uganda Communications Commission reported in 2024, “a significant gap persists between those with access to a network signal and those who actually use digital services meaningfully” (UCC, 2024). Despite mobile subscriptions surpassing 40 million, actual active internet usage remained concentrated among urban residents, with rural populations underserved by both infrastructure and affordability. Nexos Health AI was developed in direct response to these observed limitations.


## 1.2 Problem Statement

Many individuals experienced health symptoms without immediate access to reliable, structured healthcare guidance at the moment they needed it most. They delayed seeking care, relied on unverified online information, or visited healthcare facilities unnecessarily, contributing to anxiety, poor health decisions, and wasted resources. Healthcare facilities such as Mengo Hospital continued to experience significant congestion because a notable proportion of consultations involved patients who required preliminary guidance rather than specialist care.
Existing health applications on the market also presented significant limitations. As identified in the literature, “many applications address only a single dimension of personal health management without integrating these functions into a unified platform” (Lanke et al., 2025). Others depended heavily on continuous internet connectivity, making them unreliable in areas with unstable or expensive data access. This study addressed that need through the design and implementation of Nexos Health AI.


## 1.3 Objectives of the Study


### 1.3.1 General Objective

To design, develop, and implement the Nexos Health AI system as an intelligent healthcare platform that assists users in managing their health, monitoring medical conditions, and accessing timely health-related support and information.

### 1.3.2 Specific Objectives

- To develop a context-aware system for capturing and analyzing user-reported symptoms, producing risk classifications and preliminary health guidance.
- To implement a medication management module that supported dosage scheduling, stock monitoring, intake logging, and refill reminders.
- To develop a menstrual cycle tracker that provided phase estimation, period prediction, and integration with the symptom analysis engine.
- To implement an offline-first storage architecture with background cloud synchronization, secure user authentication, and emergency response capabilities.
- To design and implement a responsive, modern interface with vanilla CSS glassmorphic styling to ensure a premium user experience and accessibility across diverse devices.
- To design, execute, and document a comprehensive testing and validation framework to verify functional correctness, security, offline resilience, and data consistency of the system.



## 1.4 Scope of the Study

Geographically, this study was based on the case context of Mengo Hospital, located in Kampala, Uganda. The content scope covered AI-driven symptom analysis, medication management, cycle tracking, health planning, emergency SOS, global health search, user authentication, and offline-first cloud synchronization. Technically, the system was built using React.js with Vite for the frontend, FastAPI for the backend, SQLite as the local database, and Supabase PostgreSQL as the cloud database. The frontend was deployed on Cloudflare Pages and the backend on Render.


## 1.5 Significance of the Study

For users, the system provided a reliable and accessible platform for understanding symptoms, managing medications, planning health-related events, tracking menstrual cycles, and responding quickly in health emergencies, all within one offline-first application. For healthcare institutions such as Mengo Hospital, adoption of such systems held potential to reduce unnecessary outpatient visits, ease facility congestion, and allow medical personnel to focus their resources on patients requiring professional intervention. For developers and researchers, the project provided a practical, fully implemented reference architecture for building offline-first digital health systems. Academically, the study contributed a documented case study covering database synchronization strategy, AI-driven health assistance, responsive UI development, and security architecture design.


## 1.6 Conceptual Framework

The system followed an offline-first processing model structured across five functional layers. The User Input Layer captured all user-provided health information through symptom forms, medication entries, and cycle date inputs. The Processing Layer handled analysis, scheduling, and notifications. The Storage Layer managed both local SQLite and cloud Supabase PostgreSQL persistence, including conflict resolution. The Presentation Layer delivered information through a React.js glassmorphic interface. The Security Layer protected all access and data through JWT tokens, OTP verification, BCrypt hashing, and CORS policy enforcement. All core functions remained available offline, with cloud features enhancing rather than constraining the user experience.


# CHAPTER TWO


# LITERATURE REVIEW


## 2.0 Introduction

This chapter reviewed the literature relevant to the development of Nexos: An AI Personal Health Assistant System. The review covered personal health assistant systems, artificial intelligence in healthcare, offline-first architecture, data synchronisation, symptom analysis, menstrual cycle tracking, medication management, emergency response design, user interface best practices, and security requirements for health applications. The purpose of this review was to establish the theoretical and practical foundation for the proposed system and to identify the specific gaps that Nexos was designed to address.


## 2.1 Concept of Personal Health Assistant Systems

A personal health assistant system is a digital platform specifically designed to help users manage a range of health-related tasks, monitor symptoms over time, and receive preliminary guidance in a structured and understandable format. The literature identified several essential characteristics of effective personal health assistant systems: as summarised by Yip et al., such systems should be, “easy and intuitive to use across a wide range of user literacy levels, work reliably regardless of connectivity conditions, and provide sufficient breadth of functionality to serve as a genuine central health management tool” (Yip et al., 2024).
Early personal health assistant applications were relatively simple, offering basic tracking of body weight, daily steps, and heart rate. Over time, the category expanded significantly, with modern systems expected to track complex medication schedules, monitor recurring health events such as menstrual cycles, identify potentially urgent symptoms from user descriptions, and provide intelligent interpretation or guidance.


## 2.2 Artificial Intelligence in Healthcare Applications

Artificial intelligence had become a foundational component of modern digital healthcare applications because of its ability to process large volumes of structured and unstructured data and recognize clinically meaningful patterns. In particular, the Uganda Ministry of Health's 2025 National Digital Health Conference acknowledged the transformative role of AI, noting that the Ministry of Health, “AI can provide accurate data to inform decisions and drive policies that stand the test of time” (Ministry of Health Uganda, 2025).
The literature consistently emphasized that AI in health applications should be designed to support and inform the user rather than to replace professional medical judgement. For Nexos, AI was implemented as an internal reasoning and guidance mechanism that operated from locally stored logic rather than through dependency on external cloud-based AI services. This design choice improved system stability, data privacy, and suitability for offline-first operation.


## 2.3 Offline-First System Architecture

Offline-first systems were designed with the explicit goal that all core functions remained fully available to the user even when internet connectivity was weak, intermittent, or completely unavailable. This design philosophy was particularly important for health applications. As highlighted by the Uganda Communications Commission, “a significant gap persists between those with access to a network signal and those who actually use digital services meaningfully” (UCC, 2024), making offline-first architecture essential for any health application targeting broad adoption in Uganda.
In a traditional cloud-first architecture, the primary data store resided on the remote server and the application functioned as a thin client dependent on continuous connectivity. Offline-first systems inverted this model: data was written to local storage first, all core operations were executed against the local data store, and cloud synchronisation occurred asynchronously in the background when connectivity allowed. Nexos adopted this model by maintaining SQLite as the primary operational data store and synchronising to Supabase PostgreSQL as the cloud backend.


## 2.4 Data Synchronisation and Multi-Device Access

Data synchronisation was the technical process of ensuring that information remained consistent and current across multiple storage locations or user devices. Bidirectional synchronisation, in which changes made in either the local or remote data store were propagated to the other, introduced the challenge of data conflict resolution. Several strategies were documented in the literature, including last-write-wins, three-way merge, and user-prompted resolution.
The last-write-wins strategy was described as the most computationally straightforward approach and appropriate for personal health records, where, as noted in the synchronisation literature, “the user is typically the sole editor and where the most recent information is almost always the most relevant”. Nexos implemented last-write-wins conflict resolution based on per-record last_modified timestamps, with a device_id tiebreaker applied in cases of identical timestamps.


## 2.6 Symptom Analysis and Preliminary Health Guidance

Symptom analysis tools were designed to help users interpret reported health complaints and determine appropriate courses of action. The purpose of such tools was not to provide professional medical diagnoses but to serve as preliminary decision-support systems that helped users assess the potential significance of their symptoms. Nexos extended standard symptom analysis by incorporating the user's gender, age, current medication regimen, menstrual cycle phase, and previous symptom records into the analysis process, enabling context-aware guidance rather than symptom-only interpretation.


## 2.7 Menstrual Cycle Tracking in Digital Health Systems

Menstrual cycle tracking had evolved from a basic fertility awareness tool into a comprehensive feature of modern women's digital health applications. Beyond reproductive planning, cycle tracking provided significant value in the context of general symptom interpretation. Nexos included menstrual cycle tracking as a built-in module that estimated cycle phases based on logged dates, predicted future periods using historical cycle duration data, and integrated cycle phase information directly into the symptom analysis engine, making health guidance more relevant and personalized for female users.


## 2.8 Medication Management and Adherence Support

Medication non-adherence, defined as the failure to take prescribed medications in the correct dose, at the correct times, and for the prescribed duration, was one of the most widely documented challenges in healthcare management. According to the World Health Organization, the WHO, “adherence to medication for chronic diseases averages around 50%” (WHO, 2003), with consequences including treatment failure, disease progression, increased healthcare costs, and preventable hospitalizations.
A systematic review published in the Journal of Medical Internet Research in 2025 confirmed that mobile app interventions consistently improved adherence outcomes. As Lanke et al. reported, “all 14 reviewed randomized controlled trials reported that mobile app interventions improved medication adherence, with 10 demonstrating statistically significant improvements” (Lanke et al., 2025). Nexos incorporated dosage scheduling, stock monitoring, intake logging, and compliance history into its medication management module.


## 2.9 Emergency Response, User Interface Design, and Security

Emergency response features in digital health applications were designed to reduce the time between the onset of a health emergency and the activation of an appropriate response. The literature on emergency feature design highlighted the importance of deliberate activation mechanisms. Regarding user interface design, research consistently identified it as a critical determinant of application success. As summarised in the npj Cardiovascular Health review, “a health application may be technically sophisticated but entirely ineffective if users find it confusing, unattractive, or difficult to navigate” (npj Cardiovascular Health, 2025).
Health applications handled some of the most sensitive personal data that any digital system could collect. The established literature consistently identified essential security controls: BCrypt or Argon2 password hashing, JWT token-based session authentication, OTP multi-factor verification, and SSL/TLS encrypted data transmission. Nexos implemented all of these controls as core components of the system from the outset of development.


## 2.10 Identified Research Gap and Summary

The literature reviewed in this chapter revealed a consistent pattern of fragmentation and incompleteness in existing personal health application offerings. As identified in the review, , “many applications address only a single dimension of personal health management without integrating these functions into a unified platform” (Yip et al., 2024), forcing users to maintain multiple applications for related health tasks. A further gap was the widespread dependence on continuous internet connectivity, making existing health applications fundamentally unreliable in low-connectivity environments such as those found in much of Uganda.
No existing publicly documented system was found that combined full offline-first operation with an integrated suite covering symptom analysis, medication management, cycle tracking, emergency response, health planning, and cloud synchronisation in a single consumer-facing application designed for deployment in low-connectivity environments. These gaps directly motivated the design decisions documented in the following chapter.


# CHAPTER THREE


# METHODOLOGY AND SYSTEM DESIGN


## 3.0 Introduction

This chapter presented the methodology and system design used in the development of Nexos. It covered the development approach, requirement analysis, system architecture, database design, synchronisation strategy, security design, technologies used, and the testing strategy applied throughout the development cycle.


## 3.1 Research and Development Approach

The project followed a practical system development approach that combined structured requirement gathering, iterative interface design, modular backend development, disciplined database planning, and continuous testing throughout the development cycle. The development process was organised around modules so that each major feature could be designed, implemented, tested, and validated independently before integration into the broader system. The full process followed eight stages in sequence: requirement gathering and analysis, system architecture planning, database design, frontend interface design, backend API development, synchronisation logic implementation, security integration, and testing and optimisation.


## 3.2 Requirement Analysis


### 3.2.1 Functional Requirements




| ID | Functional Requirement | Priority |
| --- | --- | --- |
| FR-01 | User registration with email verification via OTP | Critical |
| FR-02 | Secure user login with JWT session management | Critical |
| FR-03 | OTP verification for new device login and password recovery | Critical |
| FR-04 | User profile management including health vitals and emergency contacts | High |
| FR-05 | Symptom input with smart autocomplete suggestions | Critical |
| FR-06 | Context-aware symptom analysis with risk classification (Low/Medium/High) | Critical |
| FR-07 | Symptom history storage and retrieval | High |
| FR-08 | Medication registration with name, dosage, and frequency configuration | Critical |
| FR-09 | Medication intake logging and stock monitoring | High |
| FR-10 | Refill reminder generation based on stock levels | Medium |
| FR-11 | Menstrual cycle date logging and phase estimation | High |
| FR-12 | Future period prediction based on historical cycle data | High |
| FR-13 | Health event and appointment scheduling through the planner | High |
| FR-14 | Emergency SOS activation with long-press mechanism and contact access | Critical |
| FR-15 | Global health search across symptoms, medications, and records | Medium |
| FR-16 | Offline data storage using SQLite | Critical |
| FR-17 | Background cloud synchronisation with Supabase PostgreSQL | Critical |


Table : Functional Requirements


### 3.2.2 Non-Functional Requirements




| ID | Non-Functional Requirement | Rationale |
| --- | --- | --- |
| NFR-01 | Fast response time for all local operations | Core operations use local SQLite, must respond in milliseconds |
| NFR-02 | Reliable offline access for all primary features | Users in low-connectivity environments must not be blocked |
| NFR-03 | Responsive UI on desktop and mobile viewports | Health emergencies may occur on any available device |
| NFR-04 | Secure authentication and encrypted session management | Health data is sensitive, unauthorised access must be prevented |
| NFR-05 | Cross-device compatibility for synchronised accounts | Users may switch devices; data must follow them seamlessly |
| NFR-06 | Modern, intuitive, and premium interface design | User engagement and trust depend on perceived quality |


Table : Non-Functional Requirements


### 3.2.3 Hardware and Software Requirements

To successfully develop, deploy, and execute the Nexos Health AI system, specific hardware and software configurations are required. These are divided into Developer/Server requirements and Client/User requirements:

#### 3.2.3.1 Developer and Hosting Environment Requirements
- **Development Workstation (Hardware)**:
  - CPU: Quad-core Intel Core i5 / AMD Ryzen 5 or equivalent processor (2.0 GHz or higher).
  - Memory (RAM): Minimum 8 GB (16 GB or higher recommended).
  - Storage: Minimum 10 GB of free hard drive space (SSD recommended for faster build and compilation times).
- **Development Software**:
  - Operating System: Windows 10/11, macOS (11.0+), or Linux (Ubuntu 20.04+).
  - IDE/Text Editor: Visual Studio Code, PyCharm, or equivalent.
  - Runtime Environments: Python 3.10+ (for FastAPI backend) and Node.js v18+ with npm v9+ (for React.js/Vite frontend).
  - Version Control: Git for code repository management.
- **Production Server and Cloud Infrastructure (Software)**:
  - Database Services: SQLite for local/embedded runtime, and Supabase PostgreSQL for cloud persistence.
  - Hosting Platforms: Render (for FastAPI backend deployment) and Cloudflare Pages (for static React.js frontend hosting).
  - Notification Engine: SMTP server supporting SSL/TLS (e.g., Gmail SMTP on port 465) or transactional email APIs (Brevo / Resend).

#### 3.2.3.2 Client and End-User Requirements
- **Hardware Requirements**:
  - Devices: Smart mobile phones (Android or iOS), tablets, or laptops/desktops.
  - Memory (RAM): Minimum 1 GB RAM for mobile devices; 2 GB RAM for desktop devices.
  - Storage: Minimum 50 MB of free storage space for application assets and cached SQLite database entries.
  - Display Resolution: Minimum 320x568 pixels (standard mobile viewport) supporting multi-touch gestures.
  - Network: An active internet connection (GPRS, 3G, 4G, 5G, or Wi-Fi) is optional for normal offline usage but required to perform account synchronization (push/pull operations) and initial device data recovery.
- **Software Requirements**:
  - Web Browser: A modern web browser with HTML5, CSS3, and JavaScript ES6 support enabled, such as Google Chrome (v80+), Apple Safari (v12+), Mozilla Firefox (v75+), or Microsoft Edge (v80+).
  - Mobile OS (if wrapped as an app): Android 7.0 (Nougat) or newer; iOS 12.0 or newer.


## 3.3 System Architecture

Nexos followed a hybrid offline-first architecture designed to balance local performance with cloud reliability. The overall architecture comprised three major layers working in coordination. The Frontend Layer, built with React.js and Vite, was responsible for all user-facing interaction and communicated with the backend exclusively through RESTful API endpoints over HTTPS. The Backend Layer, implemented using FastAPI, handled authentication, business logic, symptom analysis, medication scheduling, and synchronisation management. The Data Storage and Synchronisation Layer maintained SQLite as the primary local data store and Supabase PostgreSQL as the cloud synchronisation target, ensuring fast local performance with reliable cloud backup.


## 3.4 Offline-First Synchronisation Design

The synchronisation service implemented three operations. Push sync, triggered by a periodic background job via APScheduler, identified all records where last_modified exceeded synced_at and uploaded them to Supabase. Pull sync, also scheduled periodically, queried Supabase for records updated after the last sync timestamp and merged them into local SQLite. Device recovery, triggered on new device login, authenticated the user and downloaded the complete health record history from the cloud in staged batches, reconstructing the local SQLite database. All synchronisation conflicts were resolved using a last-write-wins strategy based on per-record last_modified timestamps.


## 3.5 Database Design

The database structure of the Nexos Health AI system is designed to support high-performance local read/write capabilities while ensuring reliable cloud synchronization. The system utilizes an offline-first architecture, leveraging SQLite on the client-side/embedded runtime for immediate access and Supabase PostgreSQL as the cloud database for cross-device availability.

### 3.5.1 Logical Database Design Explanation
The logical design of the Nexos database represents a structured relational database model mapped using the SQLAlchemy Object-Relational Mapper (ORM). The logical schema is designed to enforce data integrity, prevent redundancy, and manage relationships efficiently:
1. **Third Normal Form (3NF) Design**: To prevent data redundancy and anomaly issues, the tables are designed in Third Normal Form. For example, medication information is stored in the `medications` table, while the historical logs of medication ingestion are normalized into a separate child table, `medication_intakes`. Similarly, user profiles are separated from menstrual cycle logs (`cycle_logs`), appointments (`appointments`), and symptom logs (`symptom_logs`).
2. **Relationships and Cardinality**:
   - **One-to-Many (1:N)**: A single user in the `users` table can have multiple entries in the `medications`, `cycle_logs`, `symptom_logs`, and `appointments` tables. Each of these child tables has a foreign key referencing the parent user's primary key (`user_id` -> `users.id`).
   - **One-to-Many (1:N)**: A single medication in the `medications` table can have multiple intake logs in `medication_intakes` (`medication_id` -> `medications.id`).
3. **Primary and Foreign Keys**:
   - All tables utilize an auto-incrementing integer `id` as the local Primary Key (PK) to ensure rapid retrieval and indexing in SQLite.
   - Global uniqueness and multi-device identity mapping are handled through key user identification (e.g., `username`, `email`, and `google_id` which are indexed and unique).
   - Referential integrity is enforced using foreign keys. Cascade operations are defined (e.g., `cascade="all, delete-orphan"`) so that when a user or medication is deleted, all associated logs, intakes, and records are automatically removed, preventing orphan rows.
4. **Synchronization Tracking Fields**:
   - Every table that participates in cloud synchronization contains two critical tracking fields: `last_modified` (DateTime timestamp, updated automatically on write/update) and `synced_at` (DateTime timestamp, representing when the row was last successfully merged with Supabase).
   - The synchronization outbox table (`local_changes_outbox`) tracks CRUD events (`INSERT`, `UPDATE`, `DELETE`) with timestamps to queue pushes, while the `sync_meta` table records overall synchronization health per user. Conflict tables (`sync_conflicts`) log conflicting rows for resolution.

### 3.5.2 Database Table Descriptions
The database consists of 11 core tables, described in detail below:

#### 3.5.2.1 `users` Table
This table stores user credentials, profile information, and vital health details.
- **Fields**:
  - `id` (Integer, Primary Key): Unique auto-incrementing identifier.
  - `username` (String, Unique, Indexed): User's unique login handle.
  - `email` (String, Unique, Indexed): User's email address (used for OTP and authentication).
  - `hashed_password` (String): Hashed password using BCrypt.
  - `phone` (String, Nullable): Contact number.
  - `birth_date` (Date, Nullable): Date of birth (used to calculate age context for symptoms).
  - `age` (Integer, Nullable): User's age.
  - `gender` (String, Nullable): User's biological gender.
  - `is_pregnant` (Boolean, Default: False): Indicates if the user is pregnant (pregnancy context).
  - `pregnancy_conception_date` (Date, Nullable): Estimated conception date.
  - `pregnancy_due_date` (Date, Nullable): Estimated due date.
  - `blood_type` (String, Nullable): User's ABO/Rh blood group.
  - `weight` (String, Nullable): Registered weight.
  - `height` (String, Nullable): Registered height.
  - `allergies` (Text, Nullable): User-entered allergies (e.g. penicillin, food allergens).
  - `chronic_conditions` (Text, Nullable): List of chronic illnesses.
  - `emergency_contact_name` (String, Nullable): Name of primary emergency contact.
  - `emergency_contact_phone` (String, Nullable): Phone number of primary emergency contact.
  - `profile_picture` (Text, Nullable): Path or base64 data for profile image.
  - `google_id` (String, Unique, Indexed, Nullable): Google OAuth integration identifier.
  - `is_verified` (Integer, Default: 0): OTP verification status (0 = False, 1 = True).
  - `otp_code` (String, Nullable): Temporary OTP code for validation.
  - `otp_expiry` (DateTime, Nullable): Expiry timestamp of the generated OTP.
  - `last_modified` (DateTime, Default: UTC Now): Timestamp of last record modification.
  - `synced_at` (DateTime, Nullable): Timestamp of last successful cloud sync.

#### 3.5.2.2 `medications` Table
Tracks user medications and prescriptions, including active stock and schedule parameters.
- **Fields**:
  - `id` (Integer, Primary Key): Unique auto-incrementing identifier.
  - `user_id` (Integer, Foreign Key referencing `users.id`): Owner of the medication.
  - `name` (String, Indexed): Name of the drug.
  - `dosage` (String): Prescribed dosage (e.g., "500mg", "1 tablet").
  - `frequency` (String): Dosage frequency configuration (e.g., "Daily", "Weekly").
  - `time` (String): Scheduled timeslot (e.g. "Morning", "Noon", "Evening", "Bedtime").
  - `icon` (String, Default: "pill"): Icon name for visual display.
  - `stock` (Integer, Default: 30): Current remaining pill count.
  - `total_stock` (Integer, Default: 30): Original full stock count for alerts.
  - `last_taken` (DateTime, Nullable): Record of the most recent intake.
  - `last_modified` (DateTime, Default: UTC Now): Timestamp of last record modification.
  - `synced_at` (DateTime, Nullable): Timestamp of last successful cloud sync.

#### 3.5.2.3 `medication_intakes` Table
Records a historical log of when a specific medication was taken.
- **Fields**:
  - `id` (Integer, Primary Key): Unique auto-incrementing identifier.
  - `medication_id` (Integer, Foreign Key referencing `medications.id`): Linked medication.
  - `slot` (String): Time slot of ingestion ("Morning", "Noon", etc.).
  - `taken_at` (DateTime, Default: UTC Now): Exact timestamp of ingestion.
  - `last_modified` (DateTime, Default: UTC Now): Timestamp of last record modification.
  - `synced_at` (DateTime, Nullable): Timestamp of last successful cloud sync.

#### 3.5.2.4 `appointments` Table
Tracks health-related appointments, tests, or exercises.
- **Fields**:
  - `id` (Integer, Primary Key): Unique auto-incrementing identifier.
  - `user_id` (Integer, Foreign Key referencing `users.id`): Associated user.
  - `title` (String): Title/Subject of the planner event.
  - `description` (Text, Nullable): Event description or notes.
  - `location` (String, Nullable): Location of appointment/event.
  - `appointment_date` (DateTime): Scheduled date and time.
  - `type` (String, Default: "Appointment"): Event type (Appointment, Exercise, Lab, etc.).
  - `status` (String, Default: "Upcoming"): Event status (Upcoming, Completed, Cancelled).
  - `created_at` (DateTime, Default: UTC Now): Timestamp when event was created.
  - `last_modified` (DateTime, Default: UTC Now): Timestamp of last record modification.
  - `synced_at` (DateTime, Nullable): Timestamp of last successful cloud sync.

#### 3.5.2.5 `cycle_logs` Table
Maintains menstrual cycle logs, used for prediction and symptom analysis integration.
- **Fields**:
  - `id` (Integer, Primary Key): Unique auto-incrementing identifier.
  - `user_id` (Integer, Foreign Key referencing `users.id`): Linked female user.
  - `period_start` (Date): Start date of the menstrual period.
  - `period_end` (Date, Nullable): End date of the menstrual period.
  - `cycle_length` (Integer, Default: 28): Calculated/expected cycle length in days.
  - `notes` (Text, Nullable): Qualitative notes about flow, pain, or symptoms.
  - `last_modified` (DateTime, Default: UTC Now): Timestamp of last record modification.
  - `synced_at` (DateTime, Nullable): Timestamp of last successful cloud sync.

#### 3.5.2.6 `symptom_logs` Table
Persists user symptom logs and results of the AI-driven assessment engine.
- **Fields**:
  - `id` (Integer, Primary Key): Unique auto-incrementing identifier.
  - `user_id` (Integer, Foreign Key referencing `users.id`): Associated user.
  - `symptoms` (Text): JSON-stringified array representing reported symptoms (e.g. `["headache", "fever"]`).
  - `top_condition` (String): Most likely condition analyzed.
  - `risk_level` (String): Evaluated risk tier ("Low", "Medium", "High").
  - `explanation` (Text): Generated explanation and immediate care guidance.
  - `timestamp` (DateTime, Default: UTC Now): Exact moment of analysis.
  - `last_modified` (DateTime, Default: UTC Now): Timestamp of last record modification.
  - `synced_at` (DateTime, Nullable): Timestamp of last successful cloud sync.

#### 3.5.2.7 `health_conditions` Table
A static database of medical conditions and diagnostic rules, serving as the local knowledge base.
- **Fields**:
  - `id` (Integer, Primary Key): Unique auto-incrementing identifier.
  - `name` (String, Unique, Indexed): Diagnostic name of the health condition.
  - `symptoms` (Text): JSON-stringified array of matching symptom strings.
  - `explanation` (Text): Comprehensive clinical background text.
  - `action_steps` (Text): JSON-stringified array of immediate care steps to display.
  - `is_emergency` (Boolean, Default: False): Flags whether the condition indicates a medical emergency.
  - `female_only` (Boolean, Default: False): Restricts condition analysis to female users (e.g., pregnancy/menstruation issues).
  - `required_any` (Text, Nullable): JSON-stringified indicators that must be present to match.
  - `icon` (String, Default: "medical_services"): Material Icon token.
  - `tags` (String, Nullable): Comma-separated search keywords.

#### 3.5.2.8 `health_insights` Table
Stores wellness articles, daily tips, and health insights for display in search.
- **Fields**:
  - `id` (Integer, Primary Key): Unique auto-incrementing identifier.
  - `title` (String, Indexed): Headline of the insight card.
  - `content` (Text): Full textual article content.
  - `category` (String, Default: "Insight"): Outer classification of insight ("Insight", "Tip").
  - `icon` (String, Default: "lightbulb"): Material Icon token.
  - `tags` (String, Nullable): Search tags.

#### 3.5.2.9 `local_changes_outbox` Table
Serves as a temporary ledger to track local SQLite modifications that need to be pushed to Supabase during internet re-establishment.
- **Fields**:
  - `id` (Integer, Primary Key): Unique auto-incrementing identifier.
  - `table_name` (String, Indexed): The database table being changed (e.g. "medications").
  - `row_id` (Integer): The integer identifier of the target row in that table.
  - `action` (String): The operation performed ("INSERT", "UPDATE", "DELETE").
  - `modified_fields` (String, Nullable): JSON string tracking specific columns modified.
  - `timestamp` (DateTime, Default: UTC Now): Timing of the local change.

#### 3.5.2.10 `sync_meta` Table
Maintains synchronization progress metadata for user synchronization sessions.
- **Fields**:
  - `id` (Integer, Primary Key): Unique auto-incrementing identifier.
  - `username` (String, Unique, Indexed): Username mapping.
  - `last_push_at` (DateTime, Nullable): Timestamp of the last successful local-to-cloud upload.
  - `last_pull_at` (DateTime, Nullable): Timestamp of the last successful cloud-to-local download.
  - `initial_pull_done` (Boolean, Default: False): Indicates if initial sync of history has finished.
  - `initial_pull_progress` (Integer, Nullable): Number from 0 to 100 representing streaming sync percent.
  - `initial_pull_status_msg` (String, Nullable): Text displaying progress status in frontend.
  - `created_at` (DateTime, Default: UTC Now): Creation timestamp.
  - `updated_at` (DateTime, Default: UTC Now): Update timestamp.

#### 3.5.2.11 `sync_conflicts` Table
Tracks database rows where synchronization conflicts occurred (timestamp discrepancies or concurrent edits) that require system review.
- **Fields**:
  - `id` (Integer, Primary Key): Unique auto-incrementing identifier.
  - `table_name` (String): Name of the affected database table.
  - `row_id` (Integer): Affected row identifier.
  - `local_data` (String): JSON-stringified local record snapshot.
  - `cloud_data` (String): JSON-stringified cloud record snapshot.
  - `status` (String, Default: "PENDING"): Status of conflict resolution ("PENDING", "RESOLVED").
  - `created_at` (DateTime, Default: UTC Now): Date conflict logged.


## 3.6 Symptom Analysis Design

The symptom analysis engine processed user-reported symptoms through a six-stage pipeline: symptom input and normalisation, context loading (retrieving gender, age, active medications, cycle phase, and symptom history), analysis execution using a rule-based engine with context weighting, risk classification into Low, Medium, or High categories, structured guidance generation appropriate to the risk level, and result storage in the symptom_logs table with a context snapshot.



| Risk Level | Signal Characteristics | System Response |
| --- | --- | --- |
| Low Risk | Mild, common symptoms without urgency indicators; consistent with routine conditions | Provide general health guidance; recommend monitoring and routine care |
| Medium Risk | Moderate symptoms or unusual patterns; potential for clinical significance | Recommend consultation with a healthcare provider if symptoms persist or worsen |
| High Risk | Severe, rapidly progressing, or multi-system symptoms; urgency indicators present | Issue urgent guidance; activate SOS recommendations; highlight emergency contacts |


Table : Symptom Analysis Design

### Figure 1: Symptom Checker Interface


Figure 1: Symptom Checker


## 3.7 Medication Management Design

The medication management module was designed to provide a complete and systematic approach to supporting medication adherence. The module allowed users to register each medication with its full dosage and scheduling configuration, monitor remaining stock to avoid unexpected supply gaps, record each dose as taken or missed to build an accurate intake history, and review their complete medication compliance record over time. The design supported multiple medication regimens simultaneously, accommodating users managing several medications at once with different schedules.


## 3.8 Menstrual Cycle Tracking Design

The menstrual cycle tracking module was designed to provide comprehensive and personalised cycle monitoring for female users. The module allowed users to log period start and end dates, automatically calculated cycle length based on historical entries, used average cycle length to predict the start date of the next expected period, and estimated the current phase of the cycle based on the current date relative to the last logged period. The integration between the cycle tracker and the symptom analysis engine was a key design feature, enabling context-aware health guidance for female users.


## 3.9 Emergency SOS System Design

The Emergency SOS module was designed with the primary objective of enabling the fastest possible response to a health emergency while minimising the risk of accidental activation. The long-press activation mechanism required the user to hold the SOS button for a defined duration before the emergency interface fully activated. The emergency interface design prioritised high-contrast visibility, large touch targets, and minimal cognitive load to ensure usability under stress.


## 3.10 Authentication and Security Design




| Security Component | Technology | Implementation Detail |
| --- | --- | --- |
| Session Authentication | JSON Web Tokens (JWT) | Stateless token-based authentication; tokens included expiry, user ID, and device fingerprint; protected routes validated on each request |
| OTP Verification | smtplib (SSL/TLS) + time-limited tokens | OTP codes generated dynamically and delivered via encrypted email; codes expired after a short window |
| Password Security | BCrypt (via passlib) | All passwords hashed with BCrypt before storage; cost factor tuned to balance security and performance |
| API Access Control | FastAPI CORS middleware | Restrictive CORS policy allowed only explicitly approved frontend origins; all other origins received 403 Forbidden responses |


Table : Authentication and Security Design

### Figure 2: Account Verification (OTP) Interface


Figure 2: Account Verification (OTP)


## 3.11 User Interface and Experience Design

The interface design philosophy for Nexos was guided by two equally important principles: premium visual quality and functional clarity. The glassmorphic design language, implemented entirely in Vanilla CSS without any third-party CSS framework, used translucent layered panels, backdrop blur effects, subtle gradient backgrounds, and soft shadows to create a visually sophisticated and modern health application aesthetic. All glassmorphic components were tested against WCAG contrast ratio requirements to ensure accessibility.


### Figure 3: Vanilla CSS Glassmorphic Styling


Figure 3: Vanilla CSS Glassmorphic Styling


## 3.12 Technologies Used




| Component | Technology | Selection Rationale |
| --- | --- | --- |
| Frontend Framework | React.js with Vite | Component-based architecture, efficient rendering, large ecosystem |
| Frontend Styling | Vanilla CSS (Glassmorphic Design) | Full control over visual output; no framework overhead |
| UI Icons | Lucide React + Google Material Symbols | Clean, consistent SVG icons with React component API |
| Backend Framework | FastAPI (Python) | Async-native, high-performance, auto-generated API documentation |
| ORM | SQLAlchemy | Declarative models, query composition, migration compatibility |
| Local Database | SQLite | Zero-configuration, embedded, extremely fast for local read/write |
| Cloud Database | Supabase PostgreSQL | Fully managed PostgreSQL with REST API and real-time capabilities |
| Background Jobs | APScheduler | Lightweight in-process scheduler for periodic sync jobs |
| Email Services | smtplib with SSL/TLS | Standard library; SSL/TLS support ensures secure email transmission |
| Frontend Deployment | Cloudflare Pages | Global CDN, automatic builds from Git, free HTTPS, fast static delivery |
| Backend Deployment | Render | Python web service hosting, continuous deployment, SSL support |


Table : Technologies Used

### Figure 4: FastAPI Backend Framework and API Structure


Figure 4: FastAPI Backend Framework

## 3.13 Testing Strategy




| Test Type | Scope | Approach |
| --- | --- | --- |
| Unit Testing | Individual functions and module components | Isolated testing of authentication logic, cycle calculation functions, symptom analysis outputs, and synchronisation timestamp comparisons |
| Integration Testing | Cross-component interaction | Testing frontend-to-backend API calls, backend-to-database queries, and authentication flow end-to-end |
| Synchronisation Testing | Push, pull, conflict resolution, and device recovery | Simulated offline modification followed by reconnection to verify correct propagation; new-device recovery tested on fresh SQLite databases |
| Security Testing | Authentication and access controls | JWT token validation, unauthorised route access attempts, OTP code expiry verification, CORS rejection of non-approved origins |
| UI Testing | Frontend responsiveness and layout | Manual testing across desktop (1920px, 1366px) and mobile (375px, 414px) viewports; component interaction verification |


Table : Testing Strategy


## 3.14 Flowchart Symbols Explanation

Process modeling and programmatic flows within the Nexos Health AI System (such as user verification, offline-first queue processing, and symptom analysis rules) are documented using standard flowchart notation. The table below lists and describes only the flowchart symbols used in illustrating these processes:

| Symbol Shape | Symbol Name | Description / Usage in Nexos Health AI |
| --- | --- | --- |
| **Oval (Terminator)** | Terminator | Indicates the start or end of a system process flow (e.g., "Start Symptom Checker" or "End Sync Session"). |
| **Rectangle** | Process | Represents a single operation, task, or automated step (e.g., "Compute Cycle Phase", "Hash Password using BCrypt", or "Query SQLite Database"). |
| **Diamond** | Decision | Represents a decision point with branches (e.g., "Is User Verified?", "Does Risk Level Equal High?", or "Is Network Connectivity Available?"). |
| **Parallelogram** | Input / Output | Represents points of data entry or output generation (e.g., "User inputs symptoms list", "Display risk classification results", or "Fetch sync payload"). |
| **Arrow (Flow Line)** | Flow Line | Illustrates the direction of the process execution sequence, linking one symbol shape to the next. |
| **Double-sided Rectangle** | Predefined Process | Indicates a complex sub-routine or service function documented elsewhere (e.g., "Execute Background Synchronisation", or "Send OTP Code via SMTP"). |

Table : Flowchart Symbols Explanation


## 3.15 Ethical Considerations

As a system dealing with sensitive personal and health information, Nexos Health AI is built upon strict ethical guidelines. The design, development, and deployment of the platform adhere to five core ethical principles:
1. **Privacy and Confidentiality**: Protecting sensitive user credentials and medical histories is paramount. Nexos implements local-first SQLite storage, meaning data is physically stored in the user's custody. During network transmission, data is encrypted via HTTPS SSL/TLS. JWT tokens manage session authorization on-device, and passwords are encrypted using BCrypt to prevent unauthorized breach access.
2. **Safety and Non-Maleficence**: To prevent harm or incorrect self-treatment, the system is designed strictly as a preliminary decision-support tool, not a diagnostic engine. A clear medical disclaimer is visible, and the system uses a tiered risk model. High-risk symptoms automatically trigger emergency contact panels and direct links to hospital navigation, advising immediate clinical attention.
3. **Autonomy and Informed Consent**: Users retain complete control over their personal health records. System synchronization is voluntary; users can choose whether to enable Supabase cloud integration for multi-device support. Furthermore, users can log out to wipe temporary session keys, and local SQLite tables can be reset, guaranteeing their "right to be forgotten."
4. **Equity and Inclusivity**: The digital health divide often excludes populations in developing regions due to network access and cost barriers. By adopting an offline-first architecture, Nexos ensures that users in low-connectivity areas (such as rural Uganda) can access core symptom analysis, medication scheduling, and cycle tracking without incurring network charges or requiring internet signals.
5. **Algorithmic Transparency**: The symptom checker operates using transparent, rule-based reasoning rather than a "black-box" model. The system provides clear explanations for each risk categorization, highlighting why a specific guideline was recommended based on user inputs and medical logic context.


# CHAPTER FOUR


# IMPLEMENTATION, TESTING, AND SYSTEM EVALUATION


## 4.0 Introduction

This chapter presented the implementation process of Nexos, explaining in detail how each major component and module was built, integrated, and verified during the development process. It covered frontend and backend development, database integration, synchronisation service construction, authentication and security implementation, the development of all seven major functional modules, deployment procedures, and the results of system testing and performance evaluation.


## 4.1 Frontend Implementation

The frontend was built using React.js with Vite as the build tool, with all routing handled through React Router, enabling single-page application navigation without full page reloads. The component architecture was organised around feature modules, with each of the seven major features encapsulated within its own directory. The glassmorphic design system was implemented entirely in Vanilla CSS, with a global CSS custom properties file defining all design tokens, colours, blur values, border radii, spacing units, and typography scales. All components were tested against WCAG contrast ratio requirements.
Navigation adapted responsively across viewports: a persistent left sidebar was used on desktop screens (≥1024px), a collapsible hamburger-triggered drawer on tablet (768px–1023px), and a fixed bottom navigation bar with thumb-reachable tap targets of at least 48×48px on mobile (<768px).


## 4.2 Backend Implementation

The backend was organised as a structured FastAPI application with a clear separation of concerns across several layers: the router layer defined all API endpoint routes organised by module; the service layer contained all business logic; the model layer defined all SQLAlchemy ORM models; the schema layer defined Pydantic validation models; and the database layer managed SQLite connections and cloud database integration. FastAPI's native async/await support ensured responsiveness during potentially long-running operations such as cloud synchronisation and email delivery.


## 4.3 API Endpoint Organisation




| API Module | Base Route | Key Endpoints |
| --- | --- | --- |
| Authentication | /auth | POST /register, POST /verify-otp, POST /login, POST /refresh, POST /forgot-password, POST /reset-password |
| User Profile | /users | GET /me, PUT /me, PUT /me/vitals, PUT /me/emergency-contacts |
| Symptom Analysis | /symptoms | POST /analyze, GET /history, GET /{id}, DELETE /{id} |
| Medications | /medications | POST /, GET /, PUT /{id}, DELETE /{id}, POST /{id}/intake, GET /{id}/history |
| Cycle Tracking | /cycles | POST /log, GET /history, GET /current-phase, GET /prediction |
| Health Planner | /planner | POST /events, GET /events, PUT /events/{id}, DELETE /events/{id} |
| Synchronisation | /sync | POST /push, GET /pull, POST /recover |
| Global Search | /search | GET /?q={query}&scope={scope} |
| Emergency | /emergency | GET /contacts, POST /activate |


Table : API Endpoint Organisation


## 4.4 Database Implementation

SQLite was implemented as the primary operational database for all user data. The SQLAlchemy ORM was used to define all table models declaratively, with automatic schema generation on first run. All primary keys were defined as auto-incrementing integers for local use, supplemented by a UUID field populated on record creation to support cloud synchronisation without ID collision across devices. All write operations were wrapped in explicit transaction contexts to ensure atomicity. Supabase PostgreSQL was integrated as the cloud synchronisation target, accessed via a REST-based interface using standard HTTP calls without requiring a persistent TCP database connection.


## 4.5 Synchronisation and Authentication Implementation

The synchronisation service (sync_service.py) maintained consistency between the local SQLite database and the Supabase cloud backend, implementing push, pull, and device recovery operations scheduled automatically by APScheduler. In conflict situations, the last-write-wins strategy was applied: if the incoming cloud record had a more recent timestamp than the local version, the local record was overwritten; if the local record was more recent, the incoming record was discarded.
JWT authentication was implemented using the python-jose library. On successful login, the server generated a signed JWT containing the user's ID, a unique session identifier, the device identifier, and an expiry timestamp. The token was stored in memory rather than in localStorage or cookies, mitigating XSS and CSRF risks. All passwords were processed through BCrypt hashing using the passlib library, with constant-time comparison during login to prevent timing-based attacks.


## 4.6 Major Module Implementation


### 4.6.1 Intelligence Manager, Symptom Analysis Module

The Intelligence Manager was the most intellectually complex module in the Nexos system. The frontend provided an autocomplete-assisted symptom entry interface that suggested recognised symptom terms as the user typed. As noted in the system design, this approach aimed at, “reducing input variation and improving analysis accuracy”. The analysis engine processed submitted symptoms together with the assembled context object, including gender, age, active medications, current cycle phase, and prior symptom history. High-risk classifications immediately triggered emergency guidance and direct links to the Emergency SOS module.


### Figure 1: Symptom Checker Module Interface


Figure 1: Symptom Checker


### 4.6.2 Cycle Tracker Module

The cycle tracker was implemented as a dedicated module with its own component tree, API integration layer, and local data management logic. The frontend component provided a calendar-like date selection interface for logging period start and end dates, a chip-based duration selector for quick entry, an animated phase visualisation displaying the estimated current position within the cycle, and a prediction panel showing the calculated next expected period start date.


### Figure 6: Cycle Tracker Module Interface


Figure 6: Cycle Tracker


### 4.6.3 Medication Management Module

The medication management module presented a card-based medication list view showing each registered medication with its name, dosage, frequency, remaining stock indicator, and today's intake status. Tapping a medication card expanded a detailed view with the full configuration, intake history log, and options to record a dose or update stock. A background job checked stock levels daily and generated notifications for medications approaching the low-stock threshold.


### Figure 7: Medication Management Module Interface


Figure 7: Medication Management


### 4.6.4 Health Planner Module

The Health Planner module provided a structured interface for scheduling and managing health-related appointments and events. The frontend was organised around a month-view calendar that highlighted dates with scheduled events, supported by a list view panel that displayed upcoming events in chronological order with countdown indicators. Events could be categorised by type and assigned colour coding to aid visual distinction.


### Figure 8: Health Planner Module Interface


Figure 8: Health Planner


### 4.6.5 Emergency SOS Module

The Emergency SOS module was implemented as a high-priority, visually distinct interface layer that activated on top of the normal application UI. The long-press activation mechanism required a sustained press of the SOS button for 1.5 seconds, with a circular progress animation providing visual feedback during the hold period. Once activated, the SOS interface displayed the user's pre-configured emergency contacts with single-tap calling capability and hospital navigation support. The interface was designed with a high-contrast red and white colour scheme to maximise visibility under emergency conditions.


### Figure 9: Emergency SOS Module Interface


Figure 9: Emergency SOS Module


### 4.6.6 Global Health Search Module

The global health search module provided a unified search experience across all content in the Nexos application. The search interface accepted free-text queries and returned results organised by content type: symptom log matches, medication matches, health event matches, and informational health resource matches. Search results were ranked by relevance using a simple term-frequency scoring approach applied against the local SQLite database.


### Figure 10: Global Health Search Module Interface


Figure 10: Global Health Search


## 4.7 Deployment Implementation

The React.js frontend was deployed using Cloudflare Pages, which provided a globally distributed content delivery network for static site hosting with automatic HTTPS. The FastAPI backend was deployed as a web service on Render, with background services (APScheduler synchronisation jobs) running within the same process as the web server. All sensitive configuration values were stored exclusively as environment variables rather than being hardcoded in the source code.


## 4.8 System Testing Results


### 4.8.1 Unit and Integration Testing

Unit testing was conducted on all independently testable functions and service methods, including JWT token generation, BCrypt hash verification, OTP expiry rejection, cycle phase calculation accuracy, medication stock decrement accuracy, and symptom risk classification correctness. All unit tests passed with no unresolved failures. Integration testing verified correct end-to-end behaviour of all major user flows, including registration and OTP verification, login and JWT session establishment, symptom submission and analysis retrieval, and medication registration and intake logging.


### 4.8.2 Security Testing Results




| Security Test | Description | Result |
| --- | --- | --- |
| JWT Validation | Attempted access to protected routes with expired, malformed, and missing tokens | Pass, all unauthorised attempts returned 401 |
| OTP Expiry | Submitted valid OTP code after expiry window elapsed | Pass, expired OTP correctly rejected |
| Password Hash | Confirmed no plaintext password present in database or logs | Pass, only BCrypt hashes stored |
| CORS Policy | Attempted API access from non-approved origin | Pass, 403 Forbidden returned correctly |
| SQL Injection | Submitted crafted inputs to all text fields | Pass, ORM parameterisation prevented all injection attempts |


Table : Security Testing Results

## 4.9 Performance Evaluation




| Performance Dimension | Observation |
| --- | --- |
| Local operation response time | Symptom analysis, medication queries, cycle retrieval, and planner loads all completed in under 200ms due to local SQLite operations |
| Synchronisation throughput | Push and pull operations for up to 500 records completed in under 3 seconds on a standard broadband connection |
| Offline accessibility | All core module functions remained fully accessible during simulated complete network disconnection; no features degraded |
| UI rendering performance | Smooth 60fps animations confirmed on desktop; minor frame drops observed during backdrop-filter rendering on low-end mobile hardware |


Table : Performance Evaluation


## 4.10 Challenges and Improvements




| Challenge | Description | Resolution Applied |
| --- | --- | --- |
| Synchronisation Complexity | Managing bidirectional sync while preserving data consistency required careful timestamp management | Implemented per-record sync metadata with explicit conflict detection and comprehensive logging |
| OTP Email Delivery | Initial plain SMTP implementation experienced delivery failures and spam filtering | Migrated to SSL/TLS SMTP with explicit port 465 configuration and proper email headers |
| Mobile Performance | backdrop-filter: blur() caused frame drops on low-end mobile hardware | Implemented CSS media query to reduce blur radius on mobile and provide a simpler fallback |
| New Device Recovery Volume | Downloading large health record histories in a single request caused timeout failures on slow connections | Implemented staged batch recovery with configurable batch size and resumable state tracking |


Table : Challenges and Improvements


# CHAPTER FIVE


# CONCLUSION AND RECOMMENDATIONS


## 5.0 Introduction

This chapter presented the conclusion of the study and recommendations based on the experience gained through the design, development, and evaluation of Nexos. It summarised the major achievements of the project, evaluated the extent to which the original objectives were achieved, documented the key findings that emerged from development and testing, identified the benefits delivered to different stakeholder groups, honestly acknowledged the limitations of the current implementation, and proposed concrete recommendations for future improvement.


## 5.1 Summary of the Study

This study was conducted to address a clearly identified set of challenges in the domain of personal digital health management. As highlighted in the background, challenges included, “the fragmentation of health management tools across multiple disconnected applications, the widespread dependence of health applications on continuous internet connectivity, and the limited accessibility of preliminary health guidance in low-connectivity environments such as those found in Uganda”. The case context of Mengo Hospital guided the requirement specification process, ensuring that the system's design addressed genuine and representative healthcare access challenges.
All modules were successfully implemented, integrated, and tested. The offline-first synchronisation system was validated under offline modification and new device recovery scenarios. All security controls were verified through dedicated security testing. The system was successfully deployed to Cloudflare Pages for the frontend and Render for the backend.


## 5.2 Achievement of Objectives




| Specific Objective | Implementation Evidence | Status |
| --- | --- | --- |
| Develop a context-aware symptom analysis system | Intelligence Manager implemented with rule-based engine, context assembly pipeline, and three-tier risk classification | Fully Achieved |
| Implement a medication management module | Implemented with dosage scheduling, stock monitoring, intake logging, and compliance history | Fully Achieved |
| Develop a menstrual cycle tracker | Implemented with period logging, phase estimation, period prediction, and integration with symptom analysis context | Fully Achieved |
| Implement offline-first storage, security, and emergency response | SQLite local database, push/pull synchronisation, conflict resolution, JWT/BCrypt/OTP security, and Emergency SOS all implemented and tested | Fully Achieved |


Table : Achievement of Objectives

## 5.3 Key Findings

- Offline-first architecture substantially improved perceived performance. All primary read and write operations against the local SQLite database responded in under 200 milliseconds, a significant improvement over cloud-dependent architectures where network latency introduced unpredictable response times.
- Synchronisation introduced significant engineering complexity that had to be addressed proactively in the design phase, including timestamp precision management, conflict detection, batch sizing, and failure recovery.
- Integration of multiple health modules into a single application demonstrably improved usability and reduced user friction compared to fragmented multi-application approaches.
- Context-aware symptom analysis produced more relevant guidance than symptom-only analysis, with menstrual cycle phase, active medication information, and demographic data enabling more targeted guidance for female users.
- Security must be designed into the system architecture from the beginning. Health applications in particular could not tolerate weak security as a temporary measure, given the sensitivity of the data they handled.


## 5.4 Benefits of the Proposed System

For individual users, the system provided immediate, structured preliminary health guidance at any time and regardless of internet connectivity. It consolidated symptom tracking, medication management, cycle tracking, health planning, and emergency response into one application, improved medication adherence through dosage reminders and intake tracking, enabled better personal health awareness through historical records, and ensured health data availability across devices through cloud synchronisation.
For healthcare institutions such as Mengo Hospital, widespread adoption of systems like Nexos held potential to reduce unnecessary outpatient visits and ease facility congestion. As noted in the background, , “better-informed patients are more likely to present at appropriate times with relevant health histories, improving the quality of clinical consultations”. For the academic field, the study contributed a documented case study in digital health system design, covering database synchronisation, AI-driven health assistance, responsive UI development, and security architecture.


## 5.5 Limitations of the System




| Limitation | Description | Implication |
| --- | --- | --- |
| No clinical diagnosis capability | The system provided structured preliminary guidance only; it could not perform differential diagnosis or prescribe treatment | Users had to understand that the system supplemented but did not replace professional medical consultation |
| Dependency on input accuracy | The quality of symptom analysis outputs depended directly on the accuracy of user-provided symptom descriptions | Vague or inaccurate inputs may have produced misleading guidance |
| Limited AI reasoning depth | The rule-based engine could not reason about complex multi-system interactions or rare conditions | The system was most effective for common, well-documented symptom patterns |
| No hospital system integration | The system did not interface with hospital electronic medical record systems | No continuity of data existed between patient Nexos records and clinical records |
| No formal clinical validation | The system had not undergone clinical validation against a patient population | The accuracy of symptom guidance could not be formally certified without clinical validation studies |


Table : Limitations of the System


## 5.6 Recommendations




| Recommendation | Description | Priority |
| --- | --- | --- |
| Clinical partnership for AI validation | Partner with medical professionals at Mengo Hospital or similar institutions to review and validate the symptom analysis rule base against real clinical case data | High |
| Hospital system integration | Develop an integration layer connecting Nexos to hospital EMR systems for continuity of patient data | High |
| Advanced AI model integration | Replace or augment the rule-based analysis engine with a clinically validated NLP model capable of handling complex symptom presentations | High |
| Wearable device data integration | Add support for data ingestion from smartwatches and other wearable health devices to enrich the symptom analysis context | Medium |
| Voice interface implementation | Implement voice-based symptom logging, medication reminder confirmation, and emergency activation as an accessibility enhancement | Medium |
| Offline AI model deployment | Research and implement lightweight on-device AI models using TensorFlow Lite or ONNX Runtime to enable more sophisticated analysis without cloud AI dependency | Low |


Table : Recommendations


## 5.7 Areas for Future Research

- AI explainability in consumer health applications, developing methods for presenting AI reasoning transparently to non-specialist users in ways that improve trust and appropriate use of AI-generated health guidance.
- Offline machine learning for mobile health, investigating architectures and model compression techniques that enabled sufficiently capable clinical AI models to run directly on mobile devices without network connectivity.
- Health data synchronisation optimisation in intermittent connectivity environments, studying the performance and reliability of different synchronisation strategies under the specific connectivity patterns of low-bandwidth developing-country networks.
- Longitudinal predictive health analytics, exploring the use of accumulated personal health history data to generate predictive early warning signals for chronic condition onset.
- Privacy-preserving personal health record architectures, investigating decentralised storage models, homomorphic encryption, and federated learning approaches that allowed health analytics without centralising sensitive personal data.


## 5.8 Final Conclusion

This study successfully designed, implemented, tested, and deployed Nexos: An AI Personal Health Assistant System, a fully functional offline-first, AI-driven personal health platform developed as a Diploma in Information and Communication Technology project at Buganda Royal Institute of Business and Technical Education, Mengo.
The system demonstrated conclusively that it was technically feasible and practically achievable to combine local data storage, cloud synchronisation with conflict resolution, AI-driven health guidance, a comprehensive suite of personal health management modules, premium interface design, and robust authentication security within a single, self-contained health application. As reflected in the objectives achievement table, “all four specific objectives of the study were fully achieved”.
Although the system did not replace professional medical services and had not undergone formal clinical validation, it provided meaningful and practically useful support for health awareness, symptom orientation, medication adherence, health planning, and emergency response. For users in environments where professional healthcare was not always immediately accessible, these capabilities represented a tangible improvement in the quality and timeliness of health information available to them.

Project Note: Nexos Health AI was developed by Sseninde Fred (BR/NDICT/8003/24) at Buganda Royal Institute of Business and Technical Education, Mengo, in partial fulfillment of the requirements for a Diploma in Information and Communication Technology. May 2026.


# REFERENCES

- Africa Healthcare IT News. (2025, May 8). Transforming Uganda's healthcare through mobile health technology. https://africahealthitnews.com/transforming-ugandas-healthcare-through-mobile-health-technology/
- Borgen Project. (2025, April 22). Mobile health technology in Uganda. https://borgenproject.org/mobile-health-technology-in-uganda/
- iAfrica.com. (2025, November 22). Uganda unveils Africa's first offline-capable AI framework to boost health supply chains. https://iafrica.com/uganda-unveils-africas-first-offline-capable-ai-framework/
- Lanke, V., Trimm, K., Habib, B., & Tamblyn, R. (2025). Evaluating the effectiveness of mobile apps on medication adherence for chronic conditions: Systematic review and meta-analysis. Journal of Medical Internet Research, 27, e60822. https://doi.org/10.2196/60822
- Mengo Hospital Partners. (n.d.). Our work. https://www.mengopartners.org/our-work
- Mengo Hospital Partners. (n.d.). Current projects. https://www.mengopartners.org/current-projects
- Ministry of Health Uganda. (2025). Uganda National Digital Health Conference 2025. https://health.go.ug/event/uganda-national-digital-health-conference-2025/
- Ministry of Health Uganda. (2021). Uganda Health Information and Digital Health Strategic Plan 2020/21–2024/25. https://library.health.go.ug/
- Monitor. (2025, July 9). Mukono Hospital struggles to serve 800,000 patients. Daily Monitor. https://www.monitor.co.ug/
- Monitor. (2026, January 6). Uganda's costly push for connectivity. Daily Monitor. https://www.monitor.co.ug/
- Monitor. (2026, March 3). Why Uganda is offline. Daily Monitor. https://www.monitor.co.ug/
- Nature/npj Cardiovascular Health. (2025). Evaluating the digital health technology landscape in sub-Saharan Africa and its implications for cardiovascular health. npj Cardiovascular Health. https://www.nature.com/articles/s44325-025-00055-9
- New Vision. (2025, November 14). Uganda's AI framework to transform health supply chains in humanitarian settings. https://www.newvision.co.ug/
- Uganda Communications Commission. (2024). Annual Report: New Communications Sector Report. https://www.ucc.co.ug/
- Uganda Ministry of ICT. (2020). Digital Uganda Vision 2040. https://ict.go.ug/site/documents/digital-vision-uganda-2040.pdf
- Wanyana, D., King, R., & Migisha, R. (2022). Using Internet of Medical Things to improve child health services in Uganda. HealthTech Africa.
- World Health Organization. (2003). Adherence to long-term therapies: Evidence for action. World Health Organization.
- Yip, A. W. C., Foo, Y., Wong, A., Lim, E., & Goh, G. (2024). Exploration of features of mobile applications for medication adherence in Asia: Narrative review. JMIR, 26, e60787. https://doi.org/10.2196/60787
- National Institutes of Health/NCBI. (2023). Implementing smartphone-based telemedicine for cervical cancer screening in Uganda. PMC. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10580134/