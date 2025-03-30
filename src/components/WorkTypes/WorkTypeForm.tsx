export const WorkTypeForm = () => {
  return (
    <div className="work-types">
      <h2>Види робіт</h2>
      <div className="form-group">
        <label>Назва</label>
        <input
          type="text"
          className="form-control"
          placeholder="Вид роботи"
          // ... інші пропси
        />
      </div>
      <button className="btn btn-primary">
        Додати вид роботи
      </button>
    </div>
  );
}; 