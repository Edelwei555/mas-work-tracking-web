export const TimeTrackingForm = () => {
  return (
    <div className="time-tracking-form">
      <div className="form-group">
        <h2>Види робіт</h2>
        <select 
          className="form-select"
          defaultValue=""
        >
          <option value="" disabled>Вибрати вид роботи</option>
          {/* ... options ... */}
        </select>
      </div>

      <div className="form-group">
        <h2>Локації</h2>
        <select 
          className="form-select"
          defaultValue=""
        >
          <option value="" disabled>Вибрати локацію</option>
          {/* ... options ... */}
        </select>
      </div>

      {/* ... rest of the form ... */}
    </div>
  );
}; 