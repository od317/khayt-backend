-- Receiving and Bill number sequences. Both start at 1001.
-- RCV-1001, RCV-1002, ... and BILL-1001, BILL-1002, ...
-- Roll to 5 digits naturally past 9999.
CREATE SEQUENCE receiving_number_seq START 1001;
CREATE SEQUENCE bill_number_seq START 1001;