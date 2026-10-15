import React, { useState } from "react";
import { Button, ListGroup, Modal, Table } from "react-bootstrap";
import { FaCalendarCheck } from "react-icons/fa";

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
        title="View Packet Expiry Details"
      >
        <FaCalendarCheck /> Expiry
      </Button>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCalendarCheck className="me-2" />
            Packet Expiry Details: {record.food_item || "-"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup variant="flush">
            {record.awc_name && (
              <ListGroup.Item><strong>AWC Name:</strong> {record.awc_name}</ListGroup.Item>
            )}
            {record.awc_code && (
              <ListGroup.Item><strong>AWC Code:</strong> {record.awc_code}</ListGroup.Item>
            )}
            <ListGroup.Item><strong>Food Item:</strong> {record.food_item || "-"}</ListGroup.Item>
            <ListGroup.Item>
              <strong>Total Packets:</strong> {record.quantity ?? "-"} {record.unit || ""}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Date of Receiving:</strong> {formatDate(record.date)}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Months:</strong> {record.months || record.quarter || "-"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Max Expiry Date:</strong>{" "}
              {formatDate(record.max_expirydate || record.max_expiry_date)}
            </ListGroup.Item>
          </ListGroup>

          <hr />
          <h6 className="mb-2">Packet-wise Expiry List</h6>
          <Table bordered striped size="sm" responsive className="mb-0">
            <thead>
              <tr>
                <th className="text-center">S. No.</th>
                <th className="text-center">Packets</th>
                <th className="text-center">Expiry Date</th>
                <th className="text-center">Remarks</th>
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
                <td className="text-end">Total:</td>
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
          <Button variant="secondary" onClick={() => setShow(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PacketExpiryDetails;
