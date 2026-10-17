import React, { useState } from "react";
import { Button, ListGroup, Modal, Table } from "react-bootstrap";
import { FaCalendarCheck } from "react-icons/fa";
import { useLanguage } from "./all_login/LanguageContext";

const getPacketExpiryValues = (entry) => ({
  count: Array.isArray(entry) ? entry[0] : entry?.count,
  date: Array.isArray(entry) ? entry[1] : entry?.date,
  remark: Array.isArray(entry) ? entry[2] : entry?.remark || entry?.remarks,
});

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const PacketExpiryDetails = ({ record }) => {
  const [show, setShow] = useState(false);
  const { t } = useLanguage();
  const packetExpiry = Array.isArray(record?.packet_expiry) ? record.packet_expiry : [];
  const hasExpiryDetails = packetExpiry.some((entry) => {
    const { count, date } = getPacketExpiryValues(entry);
    return (count !== "" && count != null) || (date !== "" && date != null);
  });

  if (!hasExpiryDetails) return null;

  return (
    <>
      <Button
        variant="outline-warning"
        size="sm"
        onClick={() => setShow(true)}
        title={t("View Packet Expiry Details", "पैकेट की समाप्ति विवरण देखें")}
      >
        <FaCalendarCheck /> {t("Expiry", "समाप्ति")}
      </Button>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCalendarCheck className="me-2" />
            {t("Packet Expiry Details", "पैकेट की समाप्ति विवरण")}: {record.food_item || "-"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup variant="flush">
            {record.awc_name && (
              <ListGroup.Item><strong>{t("AWC Name", "आंगनवाड़ी केंद्र का नाम")}:</strong> {record.awc_name}</ListGroup.Item>
            )}
            {record.awc_code && (
              <ListGroup.Item><strong>{t("AWC Code", "आंगनवाड़ी केंद्र कोड")}:</strong> {record.awc_code}</ListGroup.Item>
            )}
            <ListGroup.Item><strong>{t("Food Item", "खाद्य सामग्री")}:</strong> {record.food_item || "-"}</ListGroup.Item>
            <ListGroup.Item>
              <strong>{t("Total Packets", "कुल पैकेट")}:</strong> {record.quantity ?? "-"} {record.unit || ""}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>{t("Date of Receiving", "प्राप्ति की तारीख")}:</strong> {formatDate(record.date)}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>{t("Months", "महीने")}:</strong> {record.months || record.quarter || "-"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>{t("Max Expiry Date", "अधिकतम समाप्ति तिथि")}:</strong>{" "}
              {formatDate(record.max_expirydate || record.max_expiry_date)}
            </ListGroup.Item>
          </ListGroup>

          <hr />
          <h6 className="mb-2">{t("Packet-wise Expiry List", "पैकेटवार समाप्ति सूची")}</h6>
          <Table bordered striped size="sm" responsive className="mb-0">
            <thead>
              <tr>
                <th className="text-center">{t("S. No.", "क्र. सं.")}</th>
                <th className="text-center">{t("Packets", "पैकेट")}</th>
                <th className="text-center">{t("Expiry Date", "समाप्ति तिथि")}</th>
                <th className="text-center">{t("Remarks", "टिप्पणी")}</th>
              </tr>
            </thead>
            <tbody>
              {packetExpiry.map((entry, index) => {
                const { count, date, remark } = getPacketExpiryValues(entry);
                return (
                  <tr key={index}>
                    <td className="text-center">{index + 1}</td>
                    <td className="text-center fw-semibold">{count == null || count === "" ? "-" : count}</td>
                    <td className="text-center">{formatDate(date)}</td>
                    <td>{remark || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="fw-bold">
                <td className="text-end">{t("Total:", "कुल:")}</td>
                <td className="text-center">
                  {packetExpiry.reduce((sum, entry) => {
                    const { count } = getPacketExpiryValues(entry);
                    return sum + (Number.parseFloat(count) || 0);
                  }, 0)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>{t("Close", "बंद करें")}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PacketExpiryDetails;
