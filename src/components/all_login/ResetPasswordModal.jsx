import React, { useState } from 'react';
import axios from 'axios';
import '../../assets/css/modal.css';

const ResetPasswordModal = ({ isOpen, onClose, username, role, onPasswordResetSuccess, content }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResetError('');

    if (newPassword !== confirmNewPassword) {
      setResetError(content.passwordMismatch);
      return;
    }

    if (!newPassword) {
      setResetError(content.newPasswordLabel + ' is required.');
      return;
    }

    setResetLoading(true);

    try {
      const payload = {
        username: username,
        role: role,
        new_password: newPassword,
      };

      const response = await axios.post(
        'https://mahadevaaya.com/golden100days/golden100days_backend/api/reset-password/',
        payload
      );

      if (response.status === 200) {
        alert(content.resetSuccess);
        onPasswordResetSuccess(newPassword);
      } else {
        setResetError(response.data?.message || content.resetFailed);
      }
    } catch (err) {
      setResetError(err.response?.data?.message || content.resetFailed);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{content.title}</h2>
        <form onSubmit={handleSubmit}>
          {resetError && (
            <div className="alert-message error">
              <i className="bi bi-exclamation-circle"></i>
              {resetError}
            </div>
          )}
          <div className="form-group">
            <label>यूजर आईडी</label>
            <input type="text" value={username} disabled className="disabled-input" />
          </div>
          <div className="form-group">
            <label>{content.newPasswordLabel}</label>
            <div className="input-wrapper">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                <i className={showNewPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>{content.confirmPasswordLabel}</label>
            <div className="input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <i className={showConfirmPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
              </button>
            </div>
          </div>
          <button type="submit" className="login-btn" disabled={resetLoading}>
            {resetLoading ? (
              <>
                <span className="spinner"></span>
                {content.resettingButton}
              </>
            ) : (
              content.resetButton
            )}
          </button>
          <button type="button" className="cancel-btn" onClick={onClose}>
            रद्द करें
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;