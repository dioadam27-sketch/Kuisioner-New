
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

--
-- Database: `monev_pdb`
--

-- --------------------------------------------------------

--
-- Reset Tables (Drop in correct order to avoid constraint errors)
--
DROP TABLE IF EXISTS `submission_ratings`;
DROP TABLE IF EXISTS `questions`;
DROP TABLE IF EXISTS `submissions`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `lecturers`;
DROP TABLE IF EXISTS `subjects`;

-- --------------------------------------------------------

--
-- Table structure for table `lecturers`
--

CREATE TABLE `lecturers` (
  `id` varchar(50) NOT NULL,
  `nip` varchar(50) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `department` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `name`) VALUES
('mk_pdb_01', 'Pembelajaran Dasar Bersama (PDB)');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `questions`
--

CREATE TABLE `questions` (
  `id` varchar(50) NOT NULL,
  `category_id` varchar(50) NOT NULL,
  `text` text NOT NULL,
  `sort_order` int(11) DEFAULT 0,
  `type` varchar(20) DEFAULT 'likert',
  `options` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `submissions`
--

CREATE TABLE `submissions` (
  `id` varchar(50) NOT NULL,
  `timestamp` datetime NOT NULL,
  `nip` varchar(50) DEFAULT NULL,
  `lecturer_name` varchar(255) NOT NULL,
  `subject_name` varchar(255) NOT NULL,
  `class_code` varchar(50) NOT NULL,
  `semester` varchar(50) NOT NULL,
  `positive_feedback` text DEFAULT NULL,
  `constructive_feedback` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `submission_ratings`
--

CREATE TABLE `submission_ratings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `submission_id` varchar(50) NOT NULL,
  `question_id` varchar(50) NOT NULL,
  `rating` int(11) NOT NULL,
  `answer_text` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Constraints
--

ALTER TABLE `questions`
  ADD CONSTRAINT `fk_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE;

ALTER TABLE `submission_ratings`
  ADD CONSTRAINT `fk_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE;

COMMIT;
